import json
import sys
import time
import re
from notebooklm_mcp.auth import load_cached_tokens
from notebooklm_mcp.api_client import NotebookLMClient

DATA_FILE = "site/data.json"
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

def get_leaf_nodes(node, path=[]):
    """Recursively find all leaf nodes."""
    leaves = []
    current_path = path + [node['name']]
    
    if 'children' in node and node['children']:
        for child in node['children']:
            leaves.extend(get_leaf_nodes(child, current_path))
    else:
        # It's a leaf node
        leaves.append({
            'node': node,
            'path': current_path
        })
    return leaves

def format_citations(text, source_map, notebook_id):
    """Format [1], [2] citations as HTML links."""
    # We assume citations are simple [1], [2] etc, but mapping them to real sources 
    # requires citation metadata from the query result which isn't fully exposed in simple text.
    # However, NotebookLM usually appends a "Sources" section or we can ask for it.
    
    # Strategy: Since we don't get the citation metadata (which [1] maps to which source ID)
    # easily from the text response alone without parsing raw_response (which we can't easily do right now),
    # we will rely on a prompt engineering trick: "Include the full source title in citations like (Author, Year)".
    # OR, we stick to the user's request: "make each of the sources cited, clickable". 
    # If the response text has [1], [2], we technically don't know WHERE [1] points to unless we parse the `citation_metadata`.
    
    # Let's inspect `enrich_data.py` output again. The previous output showed:
    # "Cybersecurity awareness is defined as... (Taherdoost, 2024, p. 1650)."
    # It seems it's using APA style citations, not numeric [1]. 
    # If so, we can try to pattern match likely source titles from our source_map.
    
    formatted_text = text
    
    # Simple heuristic: If we find a source title in the text, link it.
    # But titles are long filenames like "ALSHAIKH, 2019...pdf".
    # The text usually cites "Alshaikh (2019)".
    
    # Better approach: The user wants "final level leaf node topic" explained.
    # Let's clean up existing descriptions (remove them if we are re-generating).
    
    return formatted_text

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
        
    leaves = get_leaf_nodes(data)
    print(f"Found {len(leaves)} leaf nodes to enrich.")
    
    for i, item in enumerate(leaves):
        node = item['node']
        path_str = " > ".join(item['path'])
        
        print(f"[{i+1}/{len(leaves)}] Querying: {node['name']}...")
        
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
