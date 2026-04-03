import os
import re
import requests
import json
from datetime import datetime
from app.service.auth import AuthInstance

TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN", "")
TELEGRAM_BASE_URL = os.environ.get("TELEGRAM_BASE_URL", "https://api.telegram.org")

class ServerInfo:
    _instance = None
    
    def __new__(cls):
        if not cls._instance:
            cls._instance = super().__new__(cls)
        return cls._instance

    def get_expiry_date(self):
        if AuthInstance.kv_client:
            return AuthInstance.kv_client.get("server_expiry_date")
        return None

    def set_expiry_date(self, date_str):
        if AuthInstance.kv_client:
            AuthInstance.kv_client.set("server_expiry_date", date_str)
            return True
        return False

    def send_message(self, chat_id, text):
        try:
            url = f"{TELEGRAM_BASE_URL}/bot{TELEGRAM_TOKEN}/sendMessage"
            requests.post(url, json={"chat_id": chat_id, "text": text}, timeout=10)
        except Exception as e:
            print(f"Error sending Telegram message: {e}")

    def sync_from_telegram(self):
        try:
            # Use offset to only get new messages
            last_offset = 0
            if AuthInstance.kv_client:
                offset_data = AuthInstance.kv_client.get("telegram_last_offset")
                if offset_data:
                    last_offset = int(offset_data)

            url = f"{TELEGRAM_BASE_URL}/bot{TELEGRAM_TOKEN}/getUpdates"
            params = {"offset": last_offset + 1, "timeout": 5}
            
            print(f"[ServerInfo] Syncing Telegram (offset={last_offset + 1})...")
            resp = requests.get(url, params=params, timeout=15)
            if resp.status_code != 200:
                print(f"[ServerInfo] Telegram sync failed: {resp.status_code} - {resp.text}")
                return None
                
            data = resp.json()
            if not data.get("ok"):
                print(f"[ServerInfo] Telegram API error: {data}")
                return None
                
            updates = data.get("result", [])
            if not updates:
                print("[ServerInfo] No new messages found.")
                return None

            latest_found_date = None
            max_update_id = last_offset

            for update in updates:
                update_id = update.get("update_id")
                if update_id > max_update_id:
                    max_update_id = update_id

                message_obj = update.get("message", {})
                chat_id = message_obj.get("chat", {}).get("id")
                message = message_obj.get("text", "")
                
                if not message: continue

                if "Akun Howdy dengan username" in message and "berakhir pada" in message:
                    match = re.search(r"(\d{2}-[a-zA-Z]{3}-\d{4})", message)
                    if match:
                        found_date = match.group(1)
                        latest_found_date = found_date
                        self.set_expiry_date(found_date)
                        self.send_message(chat_id, f"✅ Update Berhasil!\nMasa aktif server diperbarui menjadi: {found_date}")
                        print(f"[ServerInfo] Successfully updated expiry to {found_date}")
                    else:
                        self.send_message(chat_id, "❌ Gagal: Format tanggal tidak ditemukan dalam pesan.")
                elif "/start" in message or "/status" in message:
                    current = self.get_expiry_date() or "Belum diatur"
                    self.send_message(chat_id, f"🤖 Server Status:\nMasa Aktif Saat Ini: {current}")

            # Update offset in Redis
            if AuthInstance.kv_client:
                AuthInstance.kv_client.set("telegram_last_offset", max_update_id)
            
            return latest_found_date
        except Exception as e:
            print(f"[ServerInfo] Sync Exception: {e}")
            return None

ServerInfoInstance = ServerInfo()
