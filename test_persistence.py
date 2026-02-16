import unittest
from unittest.mock import patch, MagicMock
import os
import sys

# Add current directory to path so we can import session
sys.path.append(os.getcwd())

from session import SessionManager

class TestSessionPersistence(unittest.TestCase):
    
    @patch('os.path.exists')
    @patch('os.access')
    @patch('os.getenv')
    def test_hf_persistence_detection(self, mock_getenv, mock_access, mock_exists):
        """Test that /data is used if it exists and is writable"""
        # Setup mocks
        mock_getenv.return_value = None # No env var set
        
        # side_effect for exists: return True for /data, False for others if needed
        def exists_side_effect(path):
            if path == "/data":
                return True
            return False # Default
            
        mock_exists.side_effect = exists_side_effect
        mock_access.return_value = True # Writable
        
        # Initialize manager
        manager = SessionManager()
        
        # Verify
        self.assertEqual(manager.storage_path, "/data/sessions.json")
        print("✅ Correctly detected Persistent Storage (/data)")

    @patch('os.path.exists')
    def test_fallback_to_local(self, mock_exists):
        """Test fallback to local file if /data does not exist"""
        mock_exists.return_value = False
        
        manager = SessionManager()
        self.assertEqual(manager.storage_path, "sessions.json")
        print("✅ Correctly fell back to local storage")

    @patch('os.getenv')
    def test_env_var_override(self, mock_getenv):
        """Test that env var overrides everything"""
        mock_getenv.return_value = "/tmp/custom_sessions.json"
        
        manager = SessionManager()
        self.assertEqual(manager.storage_path, "/tmp/custom_sessions.json")
        print("✅ Correctly respected SESSION_FILE_PATH env var")

if __name__ == '__main__':
    unittest.main()
