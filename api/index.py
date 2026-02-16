import sys
import os

# Add the root directory to sys.path so we can import from 'server' and 'app'
# Vercel runs from the root, but we put this in api/
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import app

# Vercel looks for the variable 'app' in api/index.py by default
# Or we can specify it in vercel.json
