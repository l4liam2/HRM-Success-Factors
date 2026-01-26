import sys
import json
from notebooklm_mcp.auth import load_cached_tokens
from notebooklm_mcp.api_client import NotebookLMClient

NOTEBOOK_ID = "2560eec5-1422-4fd9-9eec-48effc939ab0"

def main():
    print("Loading tokens...")
    tokens = load_cached_tokens()
    if not tokens:
        print("ERROR: No auth tokens found.")
        sys.exit(1)
    
    client = NotebookLMClient(tokens.cookies, tokens.csrf_token, tokens.session_id)
    
    print(f"Checking for mind maps in notebook {NOTEBOOK_ID}...")
    
    # 1. List existing mind maps
    try:
        # Based on api_client.py, we need to construct the request manually since there isn't a high-level list_mind_maps method exposed yet,
        # OR we can verify if `list_mind_maps` is implemented in the version of api_client we viewed.
        # Wait, the view_file of api_client showed RPC constants but I didn't see a `list_mind_maps` method implementation in the first 800 lines.
        # Let's try to call the RPC directly using _call_rpc if the high-level method doesn't exist.
        
        # Checking if list_mind_maps exists on client
        if hasattr(client, 'list_mind_maps'):
             print("Using client.list_mind_maps()...")
             maps = client.list_mind_maps(NOTEBOOK_ID)
        else:
            print("Calling RPC_LIST_MIND_MAPS directly...")
            # Guessing params based on pattern: [notebook_id]
            # Inspecting api_client.py again would be safer, but let's try a standard param structure first.
            # Usually it's [notebook_id]
            params = [NOTEBOOK_ID] 
            maps = client._call_rpc(client.RPC_LIST_MIND_MAPS, params)
            
        print("\nExisting Mind Maps:")
        print(json.dumps(maps, indent=2))
        
        if maps:
            # If maps exist, save the first one to a file
            with open("mind_map_data.json", "w") as f:
                json.dump(maps, f, indent=2)
            print("Saved mind map data to mind_map_data.json")
            
    except Exception as e:
        print(f"Failed to list mind maps: {e}")
        import traceback
        traceback.print_exc()

    # 2. Also get notebook details to see sources if mind map is empty
    print("\nFetching notebook details...")
    try:
        params = [NOTEBOOK_ID]
        notebook_data = client._call_rpc(client.RPC_GET_NOTEBOOK, params)
        # We might want to save this too
        with open("notebook_data.json", "w") as f:
            json.dump(notebook_data, f, indent=2)
        print("Saved notebook details to notebook_data.json")
    except Exception as e:
        print(f"Failed to get notebook details: {e}")

if __name__ == "__main__":
    main()
