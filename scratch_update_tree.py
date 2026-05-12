import json
import os

data_path = 'public/data.json'

with open(data_path, 'r') as f:
    data = json.load(f)

# Extract existing nodes to preserve descriptions
existing_nodes = {}
def extract_nodes(node):
    if "description" in node:
        existing_nodes[node["name"]] = node["description"]
    if "children" in node:
        for child in node["children"]:
            extract_nodes(child)

extract_nodes(data)

# Print a few to check
print(f"Extracted {len(existing_nodes)} nodes with descriptions.")

def create_node(name, children=None):
    # Try multiple names if renamed
    name_map = {
        "Self-Efficacy": "The Role of Self-Efficacy in Cybersecurity Awareness",
        "Response Efficacy": "The Architecture of Response Efficacy in Cybersecurity behavior",
        "Personal Agency": "The Architecture of Personal Agency in Cybersecurity",
        "Level 1: Non-Existent / Reactive": "Non-Existent",
        "Level 2: Compliance-Focused": "Ad-hoc reactive",
        "Level 3: Defined & Promoting": "Managed/defined",
        "Level 4: Cultural Integration & Behavioral": "Optimized/Continuous",
        "Phishing Simulations": "Phishing Evaluations",
        "Hands-On Simulations": "Hands on simulations"
    }
    
    node = {"name": name}
    
    lookup_name = name_map.get(name, name)
    if lookup_name in existing_nodes:
        node["description"] = existing_nodes[lookup_name]
    elif name in existing_nodes:
        node["description"] = existing_nodes[name]

    if children is not None:
        node["children"] = children
    return node

new_data = {
    "name": "Cybersecurity Awareness and Behavior",
    "children": [
        create_node("Human Cognition", [
            create_node("Coping and Efficacy", [
                create_node("Self-Efficacy"),
                create_node("Response Efficacy"),
                create_node("Personal Agency")
            ]),
            create_node("Behavioural Drivers", [
                create_node("Intrinsic motivation"),
                create_node("Moral beliefs"),
                create_node("Counter-neutralization")
            ]),
            create_node("Cognitive Barriers", [
                create_node("Security Fatigue"),
                create_node("Optimism Barriers"),
                create_node("Habituation"),
                create_node("Cognitive Biases")
            ])
        ]),
        create_node("Pedagogical Design", [
            create_node("Delivery Frequency", [
                create_node("Just In Time Training"),
                create_node("Continuous Reinforcement"),
                create_node("Drip-Feed Learning"),
                create_node("Communications Strategy")
            ]),
            create_node("Engagement Methods", [
                create_node("Gamification"),
                create_node("Hands-On Simulations"),
                create_node("Storytelling"),
                create_node("Interactive Media")
            ]),
            create_node("Content Tailoring", [
                 create_node("Personal Life Relevance"),
                 create_node("Role based scenarios"),
                 create_node("Audience Segmentation")
            ])
        ]),
        create_node("Organisational Governance & Culture", [
            create_node("Executive Leadership", [
                create_node("Visible Commitment"),
                create_node("Resource allocation"),
                create_node("Policy Sponsorship")
            ]),
            create_node("Organisational Culture", [
                create_node("Security Ownership"),
                create_node("Psychological Safety"),
                create_node("Social Norms")
            ]),
            create_node("Policy Framework", [
                create_node("Workforce management / integration"),
                create_node("Role Specific Ownership"),
                create_node("User Centric Design"),
                create_node("Accessibility")
            ])
        ]),
        create_node("Metrics & Impact Measurement", [
            create_node("Evaluation Methods", [
                create_node("Independent Observations"),
                create_node("Phishing Simulations"),
                create_node("Validated questionnaires")
            ]),
            create_node("Success Measurement", [
                create_node("Incident Reduction"),
                create_node("Behavioural change"),
                create_node("Knowledge retention"),
                create_node("Utility reactions")
            ]),
            create_node("Maturity stages", [
                create_node("Level 1: Non-Existent / Reactive"),
                create_node("Level 2: Compliance-Focused"),
                create_node("Level 3: Defined & Promoting"),
                create_node("Level 4: Cultural Integration & Behavioral"),
                create_node("Level 5: Optimized & Human Risk Management")
            ])
        ])
    ]
}

# Preserve description for root if any
if "description" in data:
    new_data["description"] = data["description"]

with open(data_path, 'w') as f:
    json.dump(new_data, f, indent=2)

print("Updated data.json successfully.")
