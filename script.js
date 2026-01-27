document.addEventListener('DOMContentLoaded', () => {
    const vizContainer = document.getElementById('visualization');
    const panel = document.getElementById('details-panel');
    const panelTitle = document.getElementById('panel-title');
    const panelContent = document.getElementById('panel-content');
    const closePanelBtn = document.getElementById('close-panel');
    const resetZoomBtn = document.getElementById('reset-zoom');

    // About Modal Elements
    const aboutBtn = document.getElementById('about-btn');
    const aboutModal = document.getElementById('about-modal');
    const closeAboutBtn = document.getElementById('close-about');

    // Panel interactions
    closePanelBtn.addEventListener('click', () => {
        panel.classList.add('hidden');
    });

    // About Modal Interactions
    if (aboutBtn && aboutModal && closeAboutBtn) {
        aboutBtn.addEventListener('click', () => {
            aboutModal.classList.remove('hidden');
        });

        closeAboutBtn.addEventListener('click', () => {
            aboutModal.classList.add('hidden');
        });

        // Close on click outside
        aboutModal.addEventListener('click', (e) => {
            if (e.target === aboutModal) {
                aboutModal.classList.add('hidden');
            }
        });
    }

    // Assess Program Interaction
    const assessBtn = document.getElementById('assess-btn');
    if (assessBtn) {
        assessBtn.addEventListener('click', () => {
            window.open('https://edurisk.ca', '_blank');
        });
    }

    // D3 Setup
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });

    const svg = d3.select('#visualization').append('svg')
        .attr('width', width)
        .attr('height', height)
        .call(zoom)
        .on('dblclick.zoom', null); // Disable double click zoom

    const g = svg.append('g');

    // Reset Zoom Handler
    resetZoomBtn.addEventListener('click', () => {
        svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity.translate(width / 2, height / 2).scale(1) // Center roughly
        );
    });

    // Tree Layout
    // We'll use a tidy tree layout with fixed node spacing to prevents overlap
    // nodeSize([vertical_spacing, horizontal_spacing]) because we flip x/y later
    const treeMap = d3.tree().nodeSize([110, 350]);

    let root;
    let i = 0;
    const duration = 500;

    d3.json('data.json?v=1.1').then(data => {
        root = d3.hierarchy(data, d => d.children);
        root.x0 = height / 2;
        root.y0 = 0;

        // Collapse all children initially for cleaner start
        root.children.forEach(collapse);

        update(root);

        // Initial center (vertically centered since root.x starts at 0 with nodeSize)
        svg.call(zoom.transform, d3.zoomIdentity.translate(150, height / 2).scale(1));
    });

    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }

    function update(source) {
        // Assigns the x and y position for the nodes
        const treeData = treeMap(root);

        // Compute the new tree layout
        const nodes = treeData.descendants();
        const links = treeData.links();

        // Normalize for fixed-depth (horizontal tree)
        // Increase depth spacing for cards (350px instead of 250px)
        nodes.forEach(d => { d.y = d.depth * 350; });

        // ****************** Nodes section ******************

        // Update the nodes...
        const node = g.selectAll('g.node')
            .data(nodes, d => d.id || (d.id = ++i));

        // Enter any new nodes at the parent's previous position.
        const nodeEnter = node.enter().append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${source.y0},${source.x0})`)
            .on('click', click);

        // Icon Definitions
        // Icon Definitions - Material Design Paths
        const icons = {
            // Level 1: Factors
            "Psychological Factors": "M15.5 12c2.5 0 4.5 2 4.5 4.5S18 21 15.5 21 11 19 11 16.5 13 12 15.5 12zM15.5 14a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM10.5 4a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM10.5 6a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM5.5 12C8 12 10 14 10 16.5S8 21 5.5 21 1 19 1 16.5 3 12 5.5 12zM5.5 14a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z", // Molecules/Brain-like
            "Design Factors": "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z", // Edit/Pencil
            "Organisational Factors": "M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z", // Building

            // Level 2: Categories (Psychological)
            "Coping and Efficacy": "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z", // Shield
            "Behavioural Drivers": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z", // Info/Drive (Using exclam/info for now or Compass: M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z) -> actually let's use Compass
            "Behavioural Drivers_alt": "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z", // Copied below
            "Cognitive Barriers": "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z", // Lock

            // Level 2: Categories (Design)
            "Delivery Frequency": "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z", // Clock
            "Engagement Methods": "M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z", // Puzzle/Game
            "Content Tailoring": "M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z", // Tune/Faders
            "Evaluation Methods": "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z", // Checkmark

            // Level 2: Categories (Organisational)
            "Executive Leadership": "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z", // Star
            "Organisational Culture": "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z", // Group
            "Policy Framework": "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z", // Document
            "User Centric Design": "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z", // Person
            "Success Measurement": "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z", // Trending Up
            "Maturity stages": "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H5v-4h4v-4h4v-3h6v11z", // Stairs

            // Fallback
            default: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z M11 7h2v6h-2zm0 8h2v2h-2z"
        };

        // Special mapping for exact string keys from JSON
        const getIcon = (d) => {
            const name = d.data.name;

            // Direct matches
            if (icons[name]) return icons[name];

            // Special case for Behavioural Drivers due to duplicate key issue in my Map comment above
            if (name === "Behavioural Drivers") return "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"; // Compass

            // Fallbacks based on depth if no specific icon
            if (d.depth === 1) return icons["Organisational Factors"]; // Default Building-ish
            if (d.data.children) return "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2v-3h2v3zm4 0h-2v-5h2v5z"; // Sub-category default

            return icons.default;
        };

        // --- ROOT NODE RENDERING (Circle) ---
        // Only for depth 0
        const rootNode = nodeEnter.filter(d => d.depth === 0);

        rootNode.append('circle')
            .attr('r', 65) // Large radius
            .style("fill", "#FFFFFF")
            .style("stroke", "var(--accent-color)")
            .style("stroke-width", "4px") // Thick border
            .style("filter", "drop-shadow(0 0 15px rgba(59, 130, 246, 0.3))"); // Glow effect

        rootNode.append('text')
            .attr("dy", "0.3em")
            .attr("text-anchor", "middle")
            .text(d => d.data.name)
            .style("fill", "var(--text-primary)")
            .style("font-size", "11px") /* Slightly smaller for safety */
            .style("font-weight", "800")
            .style("text-transform", "uppercase")
            .call(wrap, 110); // Standardized wrap width

        // --- CHILD NODE RENDERING (Rect Cards) ---
        // For depth > 0
        const childNode = nodeEnter.filter(d => d.depth > 0);

        // Track Colors
        const trackColors = {
            "Psychological Factors": "#9D84D6", // Muted Violet
            "Design Factors": "#58B698",       // Muted Emerald
            "Organisational Factors": "#E6B658", // Muted Amber
            "default": "#E2E8F0"
        };

        const getTrackColor = (d) => {
            if (d.depth === 0) return "var(--accent-color)"; // Root

            // Find the level 1 ancestor (the track)
            let trackNode = d;
            while (trackNode.depth > 1) {
                trackNode = trackNode.parent;
            }

            const trackName = trackNode.data.name;
            return trackColors[trackName] || trackColors.default;
        };

        childNode.append('rect')
            .attr('width', 220) // Slightly wider
            .attr('height', 80) // Taller for multi-line description
            .attr('x', -110)
            .attr('y', -40)
            .attr('rx', 12)
            .attr('ry', 12)
            .style("fill", "#FFFFFF")
            .style("stroke", d => getTrackColor(d)) // Color border by track
            .style("stroke-width", "2px") // Make it visible
            .style("filter", "drop-shadow(0 4px 6px rgba(0,0,0,0.05))");

        childNode.append('path')
            .attr('d', d => getIcon(d))
            .attr('fill', d => getTrackColor(d)) // Color icon by track
            .attr('transform', 'translate(-95, -12) scale(1.2)') // Larger icon
            .style("opacity", 1);

        childNode.append('text')
            .attr("dy", "0.32em") // Vertically center the title
            .attr("x", -65)
            .attr("text-anchor", "start")
            .text(d => d.data.name)
            .style("fill", "var(--text-primary)")
            .style("font-size", "11px")
            .style("font-weight", "700")
            .style("text-transform", "uppercase")
            .style("letter-spacing", "0.05em")
            .call(wrap, 150); // Ensure title wraps inside

        // UPDATE
        const nodeUpdate = node.merge(nodeEnter);

        // Toggle class for collapsed nodes
        nodeUpdate.classed("node--collapsed", d => d._children);

        // Transition to the proper position for the node
        nodeUpdate.transition()
            .duration(duration)
            .attr('transform', d => `translate(${d.y},${d.x})`);

        // Update the node attributes and style
        // Update the node attributes and style
        nodeUpdate.select('rect')
            .attr('width', 220)
            .attr('height', 80)
            .attr('x', -110)
            .attr('y', -40)
            .style("fill", null)
            .attr('cursor', 'pointer');

        nodeUpdate.select('circle')
            .attr('r', 65)
            .style("fill", "#FFFFFF");

        nodeUpdate.select('text')
            .style("fill-opacity", 1);

        // Remove any exiting nodes
        const nodeExit = node.exit().transition()
            .duration(duration)
            .attr('transform', d => `translate(${source.y},${source.x})`)
            .remove();

        nodeExit.select('rect')
            .attr('width', 1e-6)
            .attr('height', 1e-6);

        nodeExit.select('circle')
            .attr('r', 1e-6);

        nodeExit.select('text')
            .style("fill-opacity", 1e-6);

        // ****************** Links section ******************

        // Update the links...
        const link = g.selectAll('path.link')
            .data(links, d => d.target.id);

        // Enter any new links at the parent's previous position.
        const linkEnter = link.enter().insert('path', "g")
            .attr("class", "link")
            .attr('d', d => {
                const o = { x: source.x0, y: source.y0 };
                return diagonal(o, o);
            })
            .style("stroke", d => getTrackColor(d.target));

        // UPDATE
        const linkUpdate = link.merge(linkEnter);

        // Transition back to the parent element position
        linkUpdate.transition()
            .duration(duration)
            .attr('d', d => diagonal(d.source, d.target))
            .style("stroke", d => getTrackColor(d.target));

        // Remove any exiting links
        const linkExit = link.exit().transition()
            .duration(duration)
            .attr('d', d => {
                const o = { x: source.x, y: source.y };
                return diagonal(o, o);
            })
            .remove();

        // Store the old positions for transition.
        nodes.forEach(d => {
            d.x0 = d.x;
            d.y0 = d.y;
        });

        // Creates a curved (diagonal) path from parent to the child nodes
        function diagonal(s, d) {
            return `M ${s.y} ${s.x}
                    C ${(s.y + d.y) / 2} ${s.x},
                      ${(s.y + d.y) / 2} ${d.x},
                      ${d.y} ${d.x}`;
        }

        // Toggle children on click
        function click(event, d) {
            // If leaf node, show details
            if (!d.children && !d._children) {
                showDetails(d);
            }

            // Toggle children
            if (d.children) {
                d._children = d.children;
                d.children = null;
            } else {
                d.children = d._children;
                d._children = null;
            }
            update(d);
        }
    }

    function showDetails(d) {
        // 1. Set Title
        panelTitle.textContent = d.data.name;

        // 2. Set Description (or placeholder)
        const description = d.data.description
            ? `<p class="description">${d.data.description}</p>`
            : `<p class="placeholder">Explore concepts related to <strong>${d.data.name}</strong> in the Gamification Framework via sources.</p>`;

        // 3. Generate Key Drivers (Children or Siblings)
        let listTitle = "Key Drivers / Sub-Factors";
        let targetNodes = [];

        // Case A: Node has children (it is a category)
        if (d.data.children && d.data.children.length > 0) {
            targetNodes = d.data.children;
        }
        // Case B: Node is a leaf (it IS a driver), show its siblings
        else if (d.parent && d.parent.data.children) {
            listTitle = "Related Drivers in this Category";
            // Filter out self from siblings
            targetNodes = d.parent.data.children.filter(sibling => sibling.name !== d.data.name);
        }

        let driversHtml = '';
        if (targetNodes.length > 0) {
            const listItems = targetNodes.map(child => `
                <li class="driver-item">
                    <span class="driver-dot" style="background-color: ${d.depth === 0 ? "var(--accent-color)" : getComputedStyle(document.documentElement).getPropertyValue('--accent-color')}"></span>
                    ${child.name}
                </li>
            `).join('');

            driversHtml = `
                <div style="margin-top: 1.5rem;">
                    <label class="panel-section-label">${listTitle}</label>
                    <ul class="driver-list">
                        ${listItems}
                    </ul>
                </div>
            `;
        }

        // 4. Update Panel Content
        panelContent.innerHTML = `
            ${description}
            ${driversHtml}
        `;

        // 5. Show Panel
        panel.classList.remove('hidden');
    }

    // Handle window resize
    // Handle window resize
    window.addEventListener('resize', () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        svg.attr('width', newWidth).attr('height', newHeight);
        // treeMap.nodeSize is persistent, so no need to update size
        update(root);
    });
});

// Text wrapping helper
function wrap(text, width) {
    text.each(function () {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 1.2, // ems
            x = text.attr("x") || 0,
            y = text.attr("y") || 0,
            dy = parseFloat(text.attr("dy") || 0),
            tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");

        while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
                line.pop();
                tspan.text(line.join(" "));
                line = [word];
                tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
        }

        // Vertically center multi-line text
        // Shift up by half the total height added by extra lines
        if (lineNumber > 0) {
            const shift = -(lineNumber * lineHeight) / 2;
            text.selectAll("tspan").attr("dy", function (d, i) {
                // Determine logic: 
                // Original calculation for line N: (N * lineHeight + dy)
                // New calculation: (N * lineHeight + dy + shift)
                // However, we just grab the previously set DY or recalculate it.
                // Since this is d3 selector, i is the index (0, 1, 2...)
                return (i * lineHeight + dy + shift) + "em";
            });
        }
    });
}
