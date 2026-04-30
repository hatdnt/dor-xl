import os
import json
import time
import redis
from app.client.ciam import get_new_token
from app.client.engsel import get_profile
from app.util import ensure_api_key, get_writable_path

class Auth:
    _instance_ = None
    _initialized_ = False

    api_key = ""

    refresh_tokens = []
    # Format of refresh_tokens:
    # [
        # {
            # "number": int,
            # "subscriber_id": str,
            # "subscription_type": str,
            # "refresh_token": str
        # }
    # ]

    active_user = None
    # {
    #     "number": int,
    #     "subscriber_id": str,
    #     "subscription_type": str,
    #     "tokens": {
    #         "refresh_token": str,
    #         "access_token": str,
    #         "id_token": str
	#     }
    # }
    
    last_refresh_time = None
    
    def __new__(cls, *args, **kwargs):
        if not cls._instance_:
            cls._instance_ = super().__new__(cls)
        return cls._instance_
    
    kv_client = None

    def __init__(self):
        if not self._initialized_:
            self.api_key = ensure_api_key()
            
            # Setup Vercel KV if available (checks both KV_URL and REDIS_URL)
            kv_url = os.environ.get("KV_URL") or os.environ.get("REDIS_URL")
            if kv_url:
                try:
                    self.kv_client = redis.from_url(kv_url, decode_responses=True)
                    self.kv_client.ping() # Verify connection
                    print("Vercel KV connected and verified.")
                except Exception as e:
                    self.kv_client = None
                    print(f"Failed to connect/verify Vercel KV: {e}")

            if self.kv_client:
                print("Using Vercel KV for persistence.")
                self.load_tokens_from_kv()
                self.load_active_number_from_kv()
            else:
                print("WARNING: KV_URL not found or connection failed. Using ephemeral /tmp storage.")
                # This will reset after ~10 mins of inactivity on Vercel
                tokens_path = get_writable_path("refresh-tokens.json")
                if os.path.exists(tokens_path):
                    self.load_tokens()
                else:
                    # Create empty file
                    try:
                        with open(tokens_path, "w", encoding="utf-8") as f:
                            json.dump([], f, indent=4)
                    except OSError: pass
                self.load_active_number()

            self.last_refresh_time = int(time.time())
            self._initialized_ = True
            
    def load_tokens(self):
        tokens_path = get_writable_path("refresh-tokens.json")
        with open(tokens_path, "r", encoding="utf-8") as f:
            refresh_tokens = json.load(f)
            
            if len(refresh_tokens) !=  0:
                self.refresh_tokens = []

            # Validate and load tokens
            for rt in refresh_tokens:
                if "number" in rt and "refresh_token" in rt:
                    self.refresh_tokens.append(rt)
                else:
                    print(f"Invalid token entry: {rt}")

    def add_refresh_token(self, number: int, refresh_token: str):
        # Check if number already exist, if yes, replace it, if not append
        existing = next((rt for rt in self.refresh_tokens if rt["number"] == number), None)
        if existing:
            existing["refresh_token"] = refresh_token
        else:
            tokens = get_new_token(self.api_key, refresh_token, "")
            profile_data = get_profile(self.api_key, tokens["access_token"], tokens["id_token"])
            if not profile_data:
                print(f"Failed to fetch profile for {number}")
                return False
                
            sub_id = profile_data["profile"]["subscriber_id"]
            sub_type = profile_data["profile"]["subscription_type"]

            self.refresh_tokens.append({
                "number": int(number),
                "subscriber_id": sub_id,
                "subscription_type": sub_type,
                "refresh_token": refresh_token
            })
        
        # Save to file
        self.write_tokens_to_file()

        # Set active user to newly added
        self.set_active_user(number)
            
    def remove_refresh_token(self, number: int):
        self.refresh_tokens = [rt for rt in self.refresh_tokens if rt["number"] != number]
        
        # Save to file
        try:
            tokens_path = get_writable_path("refresh-tokens.json")
            with open(tokens_path, "w", encoding="utf-8") as f:
                json.dump(self.refresh_tokens, f, indent=4)
        except OSError: pass
        
        # If the removed user was the active user, select a new active user if available
        if self.active_user and self.active_user["number"] == number:
            # Select the first user as active user by default
            if len(self.refresh_tokens) != 0:
                first_rt = self.refresh_tokens[0]
                tokens = get_new_token(self.api_key, first_rt["refresh_token"], first_rt.get("subscriber_id", ""))
                if tokens:
                    self.set_active_user(first_rt["number"])
            else:
                input("No users left. Press Enter to continue...")
                self.active_user = None

    def set_active_user(self, number: int):
        # Get refresh token for the number from refresh_tokens
        rt_entry = next((rt for rt in self.refresh_tokens if rt["number"] == number), None)
        if not rt_entry:
            print(f"No refresh token found for number: {number}")
            input("Press Enter to continue...")
            return False

        tokens = get_new_token(self.api_key, rt_entry["refresh_token"], rt_entry.get("subscriber_id", ""))
        if not tokens:
            print(f"Failed to get tokens for number: {number}. The refresh token might be invalid or expired.")
            input("Press Enter to continue...")
            return False

        profile_data = get_profile(self.api_key, tokens["access_token"], tokens["id_token"])
        if not profile_data:
            print(f"Failed to fetch profile for {number} in set_active_user")
            return False
            
        subscriber_id = profile_data["profile"]["subscriber_id"]
        subscription_type = profile_data["profile"]["subscription_type"]

        self.active_user = {
            "number": int(number),
            "subscriber_id": subscriber_id,
            "subscription_type": subscription_type,
            "tokens": tokens
        }
        
        # Update refresh token entry with subscriber_id and subscription_type
        rt_entry["subscriber_id"] = subscriber_id
        rt_entry["subscription_type"] = subscription_type
        
        # Update refresh token. The real client app do this, not sure why cz refresh token should still be valid
        rt_entry["refresh_token"] = tokens["refresh_token"]
        self.write_tokens_to_file()
        
        self.last_refresh_time = int(time.time())
        
        # Save active number to file
        self.write_active_number()

    def renew_active_user_token(self):
        if self.active_user:
            tokens = get_new_token(self.api_key, self.active_user["tokens"]["refresh_token"], self.active_user["subscriber_id"])
            if tokens:
                self.active_user["tokens"] = tokens
                self.last_refresh_time = int(time.time())
                self.add_refresh_token(self.active_user["number"], self.active_user["tokens"]["refresh_token"])
                
                print("Active user token renewed successfully.")
                return True
            else:
                print("Failed to renew active user token.")
                input("Press Enter to continue...")
        else:
            print("No active user set or missing refresh token.")
            input("Press Enter to continue...")
        return False
    
    def get_active_user(self):
        if not self.active_user:
            # Try to reload from KV if available (crucial for serverless cold starts)
            if self.kv_client:
                self.load_tokens_from_kv()
                self.load_active_number_from_kv()
                
            if not self.active_user and len(self.refresh_tokens) != 0:
                # Try each stored token until one works
                for rt_entry in list(self.refresh_tokens):
                    print(f"Restoring session for {rt_entry['number']}...")
                    try:
                        tokens = get_new_token(self.api_key, rt_entry["refresh_token"], rt_entry.get("subscriber_id", ""))
                        if tokens:
                            self.set_active_user(rt_entry["number"])
                            break
                        else:
                            print(f"  -> Token untuk {rt_entry['number']} tidak valid, mencoba nomor berikutnya...")
                    except Exception as e:
                        print(f"  -> Error restoring {rt_entry['number']}: {e}, mencoba nomor berikutnya...")
            
            # If still None, return None
            if not self.active_user:
                if len(self.refresh_tokens) == 0:
                    print("No users found in storage.")
                else:
                    print(f"Failed to restore active user from {len(self.refresh_tokens)} stored tokens.")
                return None
            
            # SUCCESS: Return the restored active user
            return self.active_user
        
        # Token renewal logic (every 5 minutes)
        if self.last_refresh_time is None or (int(time.time()) - self.last_refresh_time) > 300:
            print(f"Renewing tokens for {self.active_user['number']}...")
            success = self.renew_active_user_token()
            if success:
                self.last_refresh_time = int(time.time())
            else:
                # If renewal fails, we might want to try re-loading from KV 
                # just in case another instance successfully renewed it.
                if self.kv_client:
                    self.load_tokens_from_kv()
                    self.load_active_number_from_kv()
        
        return self.active_user
    
    def get_active_tokens(self) -> dict | None:
        active_user = self.get_active_user()
        return active_user["tokens"] if active_user else None
    
    def load_active_number(self):
        active_path = get_writable_path("active.number")
        if os.path.exists(active_path):
            with open(active_path, "r", encoding="utf-8") as f:
                number_str = f.read().strip()
                if number_str.isdigit():
                    number = int(number_str)
                    self.set_active_user(number)

    def load_tokens_from_kv(self):
        try:
            tokens_data = self.kv_client.get("refresh-tokens")
            if tokens_data:
                self.refresh_tokens = json.loads(tokens_data)
        except Exception as e:
            print(f"Error loading tokens from KV: {e}")

    def load_active_number_from_kv(self):
        try:
            number_str = self.kv_client.get("active-number")
            if number_str and number_str.isdigit():
                self.set_active_user(int(number_str))
        except Exception as e:
            print(f"Error loading active number from KV: {e}")

    def write_tokens_to_file(self):
        if self.kv_client:
            try:
                self.kv_client.set("refresh-tokens", json.dumps(self.refresh_tokens))
            except Exception as e:
                print(f"Error saving tokens to KV: {e}")
            return

        try:
            tokens_path = get_writable_path("refresh-tokens.json")
            with open(tokens_path, "w", encoding="utf-8") as f:
                json.dump(self.refresh_tokens, f, indent=4)
        except OSError:
            print("Warning: Could not save tokens due to read-only filesystem.")
    
    def write_active_number(self):
        if self.kv_client:
            if self.active_user:
                try:
                    self.kv_client.set("active-number", str(self.active_user["number"]))
                except Exception as e:
                    print(f"Error saving active number to KV: {e}")
            else:
                try:
                    self.kv_client.delete("active-number")
                except Exception as e: pass
            return

        active_path = get_writable_path("active.number")
        if self.active_user:
            try:
                with open(active_path, "w", encoding="utf-8") as f:
                    f.write(str(self.active_user["number"]))
            except OSError: pass
        else:
            if os.path.exists(active_path):
                try:
                    os.remove(active_path)
                except OSError: pass

AuthInstance = Auth()
