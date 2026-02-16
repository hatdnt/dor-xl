import os
import json
import redis
import time
from datetime import datetime
from typing import List, Dict
from app.service.auth import AuthInstance
from app.client.engsel import send_api_request, get_package_details
from app.client.purchase.balance import settlement_balance
from app.type_dict import PaymentItem
from app.menus.util import format_quota_byte

class AutoBuy:
    _instance = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            self.configs: List[Dict] = []
            self.logs: List[Dict] = []
            self.interval = 5
            self.kv_client = AuthInstance.kv_client
            self.load_data()
            self._initialized = True

    def load_data(self):
        if self.kv_client:
            try:
                # Load Configs
                c_data = self.kv_client.get("autobuy_configs")
                if c_data: self.configs = json.loads(c_data)
                
                # Load Interval
                i_data = self.kv_client.get("autobuy_interval")
                if i_data: self.interval = int(i_data)
                
                # Load Logs
                l_data = self.kv_client.get("autobuy_logs")
                if l_data: self.logs = json.loads(l_data)
            except Exception as e:
                print(f"AutoBuy: Load failed: {e}")

    def save_data(self):
        if self.kv_client:
            try:
                self.kv_client.set("autobuy_configs", json.dumps(self.configs))
                self.kv_client.set("autobuy_interval", str(self.interval))
                self.kv_client.set("autobuy_logs", json.dumps(self.logs))
                return True
            except Exception as e:
                print(f"AutoBuy: Save failed: {e}")
                return False
        return False

    def log_event(self, status: str, message: str):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.logs.insert(0, {"timestamp": timestamp, "status": status, "message": message})
        self.logs = self.logs[:50] # Keep last 50 logs
        self.save_data()

    def clear_logs(self):
        self.logs = []
        self.save_data()

    def clear_logs_and_get_data(self):
        self.logs = []
        self.save_data()
        return self.get_data()

    def reset_all(self):
        """Reset everything: configs, interval, and logs"""
        self.configs = []
        self.logs = []
        self.interval = 5
        if self.kv_client:
            try:
                self.kv_client.delete("autobuy_configs")
                self.kv_client.delete("autobuy_interval")
                self.kv_client.delete("autobuy_logs")
                return True
            except Exception as e:
                print(f"AutoBuy: Reset failed: {e}")
                return False
        return True

    def get_data(self):
        self.load_data() # Force load from KV to ensure consistency across instances
        return {
            "configs": self.configs,
            "interval": self.interval,
            "logs": self.logs
        }

    def set_interval(self, minutes: int):
        self.interval = max(1, minutes)
        success = self.save_data()
        self.log_event("CONFIG", f"Interval ditiapkan ke {self.interval} menit")
        return success

    def update_config(self, config: Dict):
        # Config structure: { id, family_code, package_id, quota_keyword, enabled }
        exists = False
        config_id = config.get("id")
        
        if config_id:
            for i, c in enumerate(self.configs):
                if c.get("id") == config_id:
                    self.configs[i] = config
                    exists = True
                    break
        
        if not exists:
            # Prevent duplicates if same config sent twice (race condition)
            for c in self.configs:
                if (c.get("family_code") == config.get("family_code") and 
                    c.get("package_order") == config.get("package_order") and 
                    c.get("quota_keyword") == config.get("quota_keyword")):
                    return 
            
            if not config_id:
                config["id"] = str(int(time.time() * 1000))
            self.configs.append(config)
        return self.save_data()

    def delete_config(self, config_id: str):
        self.configs = [c for c in self.configs if c.get("id") != config_id]
        return self.save_data()

    async def run_check(self):
        """Main execution logic to be called by cron or background task"""
        results = []
        
        active_user = AuthInstance.get_active_user()
        if not active_user:
            return {"status": "SKIPPED", "reason": "No active user"}

        # Starting check (Internal log only, will use result log for activity history)

        # Fetch current quotas
        api_key = AuthInstance.api_key
        token = active_user["tokens"]["id_token"]
        
        quota_res = send_api_request(api_key, "api/v8/packages/quota-details", {
            "is_enterprise": False, "lang": "en", "family_member_id": ""
        }, token)

        if not quota_res or quota_res.get("status") != "SUCCESS":
            self.log_event("ERROR", "Gagal mengambil data kuota dari server XL")
            return {"status": "ERROR", "reason": "Quota fetch failed"}

        quotas = quota_res.get("data", {}).get("quotas", [])
        
        check_summary = []
        for config in self.configs:
            if not config.get("enabled"): continue
            
            family_code = config.get("family_code")
            package_order = config.get("package_order")
            keyword = config.get("quota_keyword", "").lower()
            
            # 1. Check if quota exists and is 0
            is_empty = False
            found_quota = False
            quota_val = "N/A"
            
            for q in quotas:
                benefits = q.get("benefits", [])
                for b in benefits:
                    name = b.get("name", "").lower()
                    if keyword in name:
                        found_quota = True
                        remaining = b.get("remaining", 0)
                        # Use format_quota_byte for human readable size
                        quota_val = format_quota_byte(remaining)
                        if remaining <= 0:
                            is_empty = True
                        break
                if found_quota: break
            
            if is_empty:
                try:
                    success = self.execute_purchase(family_code, package_order)
                    if success:
                        self.log_event("SUCCESS", f"Kuota '{keyword}' HABIS. Paket #{package_order} berhasil dibeli otomatis.")
                    else:
                        self.log_event("FAILED", f"Kuota '{keyword}' HABIS, tapi gagal membeli paket otomatis.")
                    results.append({"config_id": config["id"], "purchased": success})
                except Exception as e:
                    self.log_event("FAILED", f"Error saat eksekusi AutoBuy: {str(e)}")
                    results.append({"config_id": config["id"], "error": str(e)})
            else:
                if found_quota:
                    check_summary.append(f"{keyword}: {quota_val}")
                else:
                    check_summary.append(f"{keyword}: Tidak ditemukan")
                
                status = "OK" if found_quota else "QUOTA_NOT_FOUND"
                results.append({"config_id": config["id"], "status": status})

        if check_summary:
            self.log_event("PING", "Ping: Sisa kuota -> " + ", ".join(check_summary))
        elif not any(c.get("enabled") for c in self.configs):
             self.log_event("PING", "Ping: Tidak ada konfigurasi aktif.")
        else:
             self.log_event("PING", "Ping: Kuota keyword tidak ditemukan di akun.")

        return {"status": "DONE", "results": results}

    def execute_purchase(self, family_code: str, option_order: int):
        active_user = AuthInstance.get_active_user()
        api_key = AuthInstance.api_key
        tokens = AuthInstance.get_active_tokens()
        
        # Get details
        detail = get_package_details(api_key, tokens, family_code, "", option_order)
        if not detail: return False
        
        payment_items = [
            PaymentItem(
                item_code=detail["package_option"]["package_option_code"],
                product_type="",
                item_price=detail["package_option"]["price"],
                item_name=detail["package_option"]["name"],
                tax=0,
                token_confirmation=detail["token_confirmation"],
            )
        ]
        
        payment_for = detail["package_family"].get("payment_for", "SHARE_PACKAGE") or "SHARE_PACKAGE"
        
        res = settlement_balance(
            api_key, tokens, payment_items, payment_for, False,
            overwrite_amount=detail["package_option"]["price"]
        )
        
        return res and res.get("status") == "SUCCESS"

AutoBuyInstance = AutoBuy()
