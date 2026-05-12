import json

with open("public/data.json", "r") as f:
    data = json.load(f)

def modify_node(node):
    if node.get("name") == "Security Fatigue":
        node["tldr"] = "Users become overwhelmed and apathetic when bombarded with too many security warnings and requirements."
        node["examples"] = "An employee ignoring a valid phishing warning after receiving 10 false positive alerts that week."
    if "children" in node:
        for child in node["children"]:
            modify_node(child)

modify_node(data)

with open("public/data.json", "w") as f:
    json.dump(data, f, indent=2)

print("Injected mock data.")
