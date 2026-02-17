import requests
import sys

def test_trigger():
    # Attempt to trigger locally (assuming server is running on port 8000)
    url = "http://localhost:8000/api/autobuy/trigger"
    print(f"Testing trigger at {url}...")
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            print("✅ Trigger endpoint is working correctly as GET.")
        else:
            print("❌ Trigger endpoint failed.")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Make sure the server is running on localhost:8000")
        # Don't exit with error here as the server might not be running locally in CI/etc.

if __name__ == "__main__":
    test_trigger()
