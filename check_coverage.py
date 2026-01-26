import json
import sys

def check_coverage():
    try:
        with open("data.json", "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        print("Error: data.json not found.")
        return

    total = 0
    enriched = 0
    missing = []

    def traverse(node):
        nonlocal total, enriched
        total += 1
        if "description" in node and node["description"]:
            enriched += 1
        else:
            missing.append(node["name"])
        
        if "children" in node:
            for child in node["children"]:
                traverse(child)

    # Start traversal
    # If the root is "Cybersecurity Awareness and Behavior" and we don't count it usually, 
    # but let's count everything to be precise.
    traverse(data)

    print(f"Total Nodes: {total}")
    print(f"Enriched: {enriched}")
    print(f"Missing: {len(missing)}")
    if missing:
        print("\nNodes missing descriptions:")
        for name in missing:
            print(f"- {name}")

if __name__ == "__main__":
    check_coverage()
