import os
import json
import redis
from typing import List, Dict
from app.util import get_writable_path

class Bookmark:
    _instance = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            self.packages: List[Dict] = []
            self.family_bookmarks: List[Dict] = []
            self.filepath = get_writable_path("bookmark.json")
            self.family_filepath = get_writable_path("family_bookmarks.json")
            self.kv_client = None

            # Setup Vercel KV if available
            kv_url = os.environ.get("KV_URL") or os.environ.get("REDIS_URL")
            if kv_url:
                try:
                    self.kv_client = redis.from_url(kv_url, decode_responses=True)
                    self.kv_client.ping()
                except Exception as e:
                    print(f"Bookmark: Failed to connect Redis: {e}")
                    self.kv_client = None

            if self.kv_client:
                print("Bookmark: Using Vercel KV for persistence.")
                self.load_from_kv()
            else:
                self.load_from_file()

            self._initialized = True

    def load_from_kv(self):
        try:
            p_data = self.kv_client.get("bookmarks_packages")
            if p_data:
                self.packages = json.loads(p_data)
            
            f_data = self.kv_client.get("bookmarks_family")
            if f_data:
                self.family_bookmarks = json.loads(f_data)
        except Exception as e:
            print(f"Bookmark: Error loading from KV: {e}")

    def save_to_kv(self):
        if not self.kv_client: return
        try:
            self.kv_client.set("bookmarks_packages", json.dumps(self.packages))
            self.kv_client.set("bookmarks_family", json.dumps(self.family_bookmarks))
        except Exception as e:
            print(f"Bookmark: Error saving to KV: {e}")

    def load_from_file(self):
        if os.path.exists(self.filepath):
            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    self.packages = json.load(f)
            except: pass
            
        if os.path.exists(self.family_filepath):
            try:
                with open(self.family_filepath, "r", encoding="utf-8") as f:
                    self.family_bookmarks = json.load(f)
            except: pass

    def save_to_file(self):
        try:
            os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
            with open(self.filepath, "w", encoding="utf-8") as f:
                json.dump(self.packages, f, indent=4)
            
            with open(self.family_filepath, "w", encoding="utf-8") as f:
                json.dump(self.family_bookmarks, f, indent=4)
        except OSError as e:
            print(f"Bookmark: Error saving to file: {e}")

    def save_all(self):
        if self.kv_client:
            self.save_to_kv()
        else:
            self.save_to_file()

    # Original Package Bookmarks
    def add_bookmark(self, family_code: str, family_name: str, is_enterprise: bool, variant_name: str, option_name: str, order: int) -> bool:
        key = (family_code, variant_name, order)
        if any((p["family_code"], p["variant_name"], p["order"]) == key for p in self.packages):
            return False
        self.packages.append({
            "family_name": family_name,
            "family_code": family_code,
            "is_enterprise": is_enterprise,
            "variant_name": variant_name,
            "option_name": option_name,
            "order": order,
        })
        self.save_all()
        return True

    def remove_bookmark(self, family_code: str, is_enterprise: bool, variant_name: str, order: int) -> bool:
        for i, p in enumerate(self.packages):
            if (p["family_code"] == family_code and p["is_enterprise"] == is_enterprise and 
                p["variant_name"] == variant_name and p["order"] == order):
                del self.packages[i]
                self.save_all()
                return True
        return False

    def get_bookmarks(self) -> List[Dict]:
        return self.packages.copy()

    # Family Code Bookmarks (Aliases)
    def get_family_bookmarks(self) -> List[Dict]:
        return self.family_bookmarks.copy()

    def set_family_bookmarks(self, bookmarks: List[Dict]):
        self.family_bookmarks = bookmarks
        self.save_all()

    def update_family_bookmark(self, code: str, name: str):
        exists = False
        for i, b in enumerate(self.family_bookmarks):
            if b["code"] == code:
                self.family_bookmarks[i]["name"] = name
                exists = True
                break
        
        if not exists:
            self.family_bookmarks.insert(0, {"code": code, "name": name})
            self.family_bookmarks = self.family_bookmarks[:30] # Limit
            
        self.save_all()

BookmarkInstance = Bookmark()
