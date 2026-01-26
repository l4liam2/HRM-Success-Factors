import sys
import os

# Ensure the package is in path (it should be if running with venv python)
# import notebooklm_mcp

from notebooklm_mcp.auth import load_cached_tokens
from notebooklm_mcp.api_client import NotebookLMClient

def main():
    print("Loading tokens...")
    tokens = load_cached_tokens()
    if not tokens:
        print("ERROR: No auth tokens found. Please run notebooklm-mcp-auth first.")
        sys.exit(1)
    
    print(f"Authenticated! Session ID: {tokens.session_id[:10]}...")
    
    print("Initializing client...")
    client = NotebookLMClient(tokens.cookies, tokens.csrf_token, tokens.session_id)
    
    print("Fetching notebooks...")
    try:
        notebooks = client.list_notebooks()
        print(f"\nFound {len(notebooks)} notebooks:\n")
        for nb in notebooks:
            print(f"- {nb.title} (ID: {nb.id})")
            print(f"  URL: https://notebooklm.google.com/notebook/{nb.id}")
            print(f"  Sources: {nb.source_count}")
    except Exception as e:
        print(f"ERROR: Failed to list notebooks: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
