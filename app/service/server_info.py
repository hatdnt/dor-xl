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

    def sync_from_telegram(self):
        try:
            # Use provided proxy URL
            url = f"{TELEGRAM_BASE_URL}/bot{TELEGRAM_TOKEN}/getUpdates"
            
            # Use offset to only get new messages if needed, 
            # but for simplicity we'll just check last few messages
            resp = requests.get(url, timeout=10)
            if resp.status_code != 200:
                print(f"Telegram sync failed: {resp.status_code}")
                return False
                
            data = resp.json()
            if not data.get("ok"):
                return False
                
            updates = data.get("result", [])
            found_date = None
            
            for update in reversed(updates):
                message = update.get("message", {}).get("text", "")
                if "Akun Howdy dengan username" in message and "berakhir pada" in message:
                    # Regex for format: 03-Apr-2026
                    match = re.search(r"(\d{2}-[a-zA-Z]{3}-\d{4})", message)
                    if match:
                        found_date = match.group(1)
                        # Once found the most recent one, we can stop
                        break
            
            if found_date:
                print(f"Found new expiry date: {found_date}")
                self.set_expiry_date(found_date)
                return found_date
                
            return None
        except Exception as e:
            print(f"Error syncing from Telegram: {e}")
            return None

ServerInfoInstance = ServerInfo()
