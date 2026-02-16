import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

# Mock Vercel environment
os.environ["VERCEL"] = "1"

from app.util import get_writable_path, IS_VERCEL

def test_vercel_detection():
    print(f"IS_VERCEL detection: {IS_VERCEL}")
    assert IS_VERCEL == True
    print("✅ Vercel detection works.")

def test_path_redirection():
    original_path = "bookmark.json"
    writable_path = get_writable_path(original_path)
    print(f"Original: {original_path} -> Writable: {writable_path}")
    # Using normpath to handle cross-platform path differences in comparison
    assert os.path.normpath(writable_path) == os.path.normpath("/tmp/bookmark.json")
    
    abs_path = os.path.join(os.getcwd(), "test.txt")
    writable_abs = get_writable_path(abs_path)
    print(f"Absolute: {abs_path} -> Writable: {writable_abs}")
    assert os.path.normpath(writable_abs) == os.path.normpath("/tmp/test.txt")
    print("✅ Path redirection to /tmp works.")

if __name__ == "__main__":
    try:
        test_vercel_detection()
        test_path_redirection()
        print("\nAll Vercel path verification tests passed!")
    except AssertionError as e:
        print(f"\n❌ Verification failed!")
        sys.exit(1)
