import json

def create_node(name, children=None):
    node = {"name": name}
    if children:
        node["children"] = children
    return node

data = {
    "name": "Cybersecurity Awareness and Behavior",
    "children": [
        create_node("Psychological Perspective", [
            create_node("Coping and Efficacy", [
                create_node("The Role of Self-Efficacy in Cybersecurity Awareness"),
                create_node("The Architecture of Response Efficacy in Cybersecurity behavior"),
                create_node("The Architecture of Personal Agency in Cybersecurity")
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
        create_node("Design Perspective", [
            create_node("Delivery Frequency", [
                create_node("Just In Time Training"),
                create_node("Continuous Reinforcement"),
                create_node("Drip-Feed Learning"),
                create_node("Communications Strategy")
            ]),
            create_node("Engagement Methods", [
                create_node("Gamification"),
                create_node("Hands on simulations"),
                create_node("Storytelling"),
                create_node("Interactive Media")
            ]),
            create_node("Content Tailoring", [
                 create_node("Personal Life Relevance"),
                 create_node("Role based scenarios")
            ]),
            create_node("Training Design Best Practices", [
                create_node("Audience Segmentation")
            ]),
            create_node("Evaluation Methods", [
                create_node("Independent Observations"),
                create_node("Phishing Evaluations"),
                create_node("Validated questionnaires")
            ])
        ]),
        create_node("Organisational Perspective", [
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
                create_node("Role Specific Ownership"),
                create_node("User Centric Design"),
                create_node("Accessibility")
            ]),
            create_node("Success Measurement", [
                create_node("Incident Reduction"),
                create_node("Behavioural change"),
                create_node("Knowledge retention"),
                create_node("Utility reactions")
            ]),
            create_node("Maturity stages", [
                create_node("Non-Existent"),
                create_node("Ad-hoc reactive"),
                create_node("Managed/defined"),
                create_node("Optimized/Continuous")
            ])
        ])
    ]
}

with open('data.json', 'w') as f:
    json.dump(data, f, indent=2)

print("Successfully generated data.json")
