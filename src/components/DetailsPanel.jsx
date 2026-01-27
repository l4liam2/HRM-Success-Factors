
import React from 'react';

const DetailsPanel = ({ node, isOpen, onClose }) => {
    if (!node) return null;

    const { data, parent, depth } = node;
    const { name, description, children } = data;

    // Determine Drivers / Sub-Factors
    let listTitle = "Key Drivers / Sub-Factors";
    let targetNodes = [];

    // Case A: Node has children (it is a category)
    if (children && children.length > 0) {
        targetNodes = children;
    }
    // Case B: Node is a leaf (it IS a driver), show its siblings
    else if (parent && parent.data.children) {
        listTitle = "Related Drivers in this Category";
        // Filter out self from siblings
        targetNodes = parent.data.children.filter(sibling => sibling.name !== name);
    }

    const getComputedAccentColor = () => {
        // In a real React app, you might use a context or CSS variable helper.
        // For now we assume CSS variables are available on root.
        // Fallback to hardcoded if needed, but var(--accent-color) usually needs getComputedStyle
        // or we just use the var string if we are setting style in JS.
        return "var(--accent-color)";
    };

    return (
        <aside id="details-panel" className={`glass-panel ${isOpen ? '' : 'hidden'}`}>
            <button id="close-panel" aria-label="Close details" onClick={onClose}>&times;</button>
            <h2 id="panel-title">{name}</h2>
            <div id="panel-content">
                {description ? (
                    <p
                        className="description"
                        dangerouslySetInnerHTML={{ __html: description }}
                    />
                ) : (
                    <p className="placeholder">
                        Explore concepts related to <strong>{name}</strong> in the Gamification Framework via sources.
                    </p>
                )}

                {targetNodes.length > 0 && (
                    <div style={{ marginTop: '1.5rem' }}>
                        <label className="panel-section-label">{listTitle}</label>
                        <ul className="driver-list">
                            {targetNodes.map((child, index) => (
                                <li key={index} className="driver-item">
                                    <span
                                        className="driver-dot"
                                        style={{ backgroundColor: depth === 0 ? "var(--accent-color)" : undefined }} // logic from original was complex, simplifying
                                    ></span>
                                    {child.name}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </aside>
    );
};

export default DetailsPanel;
