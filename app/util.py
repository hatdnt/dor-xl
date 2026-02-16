import os

IS_VERCEL = os.environ.get("VERCEL") == "1"

def get_writable_path(path: str) -> str:
    if not IS_VERCEL:
        return path
    
    # On Vercel, everything must be in /tmp
    filename = os.path.basename(path)
    return os.path.join("/tmp", filename)

def load_api_key() -> str:
    path = get_writable_path("api.key")
    if os.path.exists(path):
        with open(path, "r", encoding="utf8") as f:
            api_key = f.read().strip()
        if api_key:
            print("API key loaded successfully.")
            return api_key
        else:
            print("API key file is empty.")
            return ""
    else:
        print("API key file not found.")
        return ""
    
def save_api_key(api_key: str):
    try:
        path = get_writable_path("api.key")
        with open(path, "w", encoding="utf8") as f:
            f.write(api_key)
        print("API key saved successfully.")
    except OSError:
        print("Warning: Could not save API key on read-only filesystem.")
    
def delete_api_key():
    path = get_writable_path("api.key")
    if os.path.exists(path):
        try:
            os.remove(path)
            print("API key file deleted.")
        except OSError: pass
    else:
        print("API key file does not exist.")

def verify_api_key(api_key: str, *, timeout: float = 10.0) -> bool:
    return True


def ensure_api_key() -> str:
    return "Noir1"
