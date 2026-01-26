import json
import sys
import time
import re
from notebooklm_mcp.auth import load_cached_tokens
from notebooklm_mcp.api_client import NotebookLMClient

DATA_FILE = "data.json"
NOTEBOOK_DATA_FILE = "notebook_data.json"
NOTEBOOK_ID = "2560eec5-1422-4fd9-9eec-48effc939ab0"

def load_source_map():
    """Load source map from notebook data."""
    source_map = {}
    try:
        with open(NOTEBOOK_DATA_FILE, 'r') as f:
            data = json.load(f)
            # Structure based on view_file output:
            # data[0][1] seem to be the list of sources
            if data and isinstance(data, list) and len(data) > 0:
                sources_list = data[0][1]
                for src in sources_list:
                    # src[0] is [id], src[1] is title
                    if isinstance(src, list) and len(src) >= 2:
                        src_id_list = src[0]
                        src_title = src[1]
                        if src_id_list and isinstance(src_id_list, list):
                            src_id = src_id_list[0]
                            source_map[src_id] = src_title
    except Exception as e:
        print(f"Warning: Could not load source map: {e}")
    return source_map

def get_all_nodes(node, path=[]):
    """Recursively find all nodes (including intermediate ones)."""
    nodes_to_process = []
    
    # Don't process the absolute root if it has no semantic meaning beyond title, 
    # but for "Cybersecurity Awareness and Behavior" it might be worth a summary.
    # We'll rely on the caller to pass the children of root if they want to skip root.
    
    current_path = path + [node['name']]
    
    # Add the current node itself
    nodes_to_process.append({
        'node': node,
        'path': current_path
    })
    
    if 'children' in node and node['children']:
        for child in node['children']:
            nodes_to_process.extend(get_all_nodes(child, current_path))
            
    return nodes_to_process

def main():
    print("Loading tokens...")
    tokens = load_cached_tokens()
    if not tokens:
        print("ERROR: No auth tokens found.")
        sys.exit(1)
        
    client = NotebookLMClient(tokens.cookies, tokens.csrf_token, tokens.session_id)
    
    print("Loading source map...")
    source_map = load_source_map()
    print(f"Loaded {len(source_map)} sources.")
    
    print(f"Loading data from {DATA_FILE}...")
    with open(DATA_FILE, 'r') as f:
        data = json.load(f)
        
    # Collect all nodes starting from children (skip root wrapper if desired, 
    # but let's just do everything inside the root's children to avoid summarizing the generic map title)
    all_nodes = []
    if 'children' in data:
        for child in data['children']:
            all_nodes.extend(get_all_nodes(child))
            
    print(f"Found {len(all_nodes)} total nodes to enrich (Levels 1-3).")
    
    for i, item in enumerate(all_nodes):
        node = item['node']
        path_str = " > ".join(item['path'])
        
        # Skip if already enriched (preserves manual edits)
        if 'description' in node and node['description']:
            print(f"[{i+1}/{len(all_nodes)}] Skipping {node['name']} (already enriched)")
            continue

        print(f"[{i+1}/{len(all_nodes)}] Querying: {node['name']}...")
        
        # We start a NEW conversation for each node to ensure fresh context
        # We ask for a specific format with source markers we can parse if possible.
        # Actually, let's just ask for the summary and standard citations.
        # The key is getting the raw response data which might contain the mapping.
        
        query = (
            f"Explain '{node['name']}' in the context of {path_str}. "
            f"Provide a concise summary (max 3 sentences). "
             "Use standard citations."
        )
        
        try:
            # We access the internal client._call_rpc logic or just use query()
            # The query() method in the library returns a dict with 'answer'.
            # It DOES NOT seem to return citation metadata in the high-level return.
            # I will modify the prompt to try to help, but truly clickable citations 
            # might require fuzzy matching source titles if metadata isn't available.
            
            result = client.query(NOTEBOOK_ID, query)
            
            if result and 'answer' in result:
                answer = result['answer']
                
                # Attempt to link sources by fuzzy matching author names from our source list?
                # E.g. "Alshaikh, 2019" -> Match to file "ALSHAIKH, 2019..."
                # This is hacky but might work given the filenames.
                
                enriched_answer = answer
                
                # Basic fuzzy linker
                for src_id, src_title in source_map.items():
                    # Extract "Author, Year" candidate from filename
                    # Filename format: "Author, Year - Title.pdf"
                    parts = src_title.split('-')[0].strip() # "ALSHAIKH, 2019"
                    if len(parts) > 5:
                        # Case insensitive check
                        if parts.lower() in enriched_answer.lower():
                            # Create link
                            url = f"https://notebooklm.google.com/notebook/{NOTEBOOK_ID}?source={src_id}"
                            link = f'<a href="{url}" target="_blank" class="citation">{parts}</a>'
                            
                            # Replace (case insensitive)
                            pattern = re.compile(re.escape(parts), re.IGNORECASE)
                            enriched_answer = pattern.sub(link, enriched_answer)
                
                node['description'] = enriched_answer
                print(f"  -> Updated description ({len(enriched_answer)} chars)")
            
            with open(DATA_FILE, 'w') as f:
                json.dump(data, f, indent=2)
            
            time.sleep(1.5) # Politeness
            
        except Exception as e:
            print(f"  -> ERROR: {e}")
            continue

    print("Enrichment complete!")

if __name__ == "__main__":
    main()
