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
    // We'll use a tidy tree layout
    const treeMap = d3.tree().size([height, width * 0.8]); // Swap width/height for horizontal tree

    let root;
    let i = 0;
    const duration = 500;

    d3.json('data.json').then(data => {
        root = d3.hierarchy(data, d => d.children);
        root.x0 = height / 2;
        root.y0 = 0;

        // Collapse all children initially for cleaner start
        root.children.forEach(collapse);

        update(root);

        // Initial center
        svg.call(zoom.transform, d3.zoomIdentity.translate(100, 0).scale(1));
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
        nodes.forEach(d => { d.y = d.depth * 250; }); // Verify depth spacing

        // ****************** Nodes section ******************

        // Update the nodes...
        const node = g.selectAll('g.node')
            .data(nodes, d => d.id || (d.id = ++i));

        // Enter any new nodes at the parent's previous position.
        const nodeEnter = node.enter().append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${source.y0},${source.x0})`)
            .on('click', click);

        // Add Circle for the nodes
        nodeEnter.append('circle')
            .attr('r', 1e-6);
        // Removed inline fill style to let CSS handle it

        // Add labels for the nodes
        nodeEnter.append('text')
            .attr("dy", ".35em")
            .attr("x", d => d.children || d._children ? -13 : 13) // Position text left or right of circle
            .attr("text-anchor", d => d.children || d._children ? "end" : "start")
            .text(d => d.data.name)
            .style("fill-opacity", 1e-6);

        // UPDATE
        const nodeUpdate = node.merge(nodeEnter);

        // Toggle class for collapsed nodes
        nodeUpdate.classed("node--collapsed", d => d._children);

        // Transition to the proper position for the node
        nodeUpdate.transition()
            .duration(duration)
            .attr('transform', d => `translate(${d.y},${d.x})`);

        // Update the node attributes and style
        nodeUpdate.select('circle')
            .attr('r', 6) // radius
            .style("fill", null) // clear any inline fill
            .attr('cursor', 'pointer');

        nodeUpdate.select('text')
            .style("fill-opacity", 1);

        // Remove any exiting nodes
        const nodeExit = node.exit().transition()
            .duration(duration)
            .attr('transform', d => `translate(${source.y},${source.x})`)
            .remove();

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
            });

        // UPDATE
        const linkUpdate = link.merge(linkEnter);

        // Transition back to the parent element position
        linkUpdate.transition()
            .duration(duration)
            .attr('d', d => diagonal(d.source, d.target));

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
        panelTitle.textContent = d.data.name;

        const description = d.data.description
            ? `<p class="description">${d.data.description}</p>`
            : `<p class="placeholder">Explore concepts related to <strong>${d.data.name}</strong> in the Gamification Framework via sources.</p>`;

        panelContent.innerHTML = `
            ${description}
            <div style="margin-top:1.5rem; padding: 0.75rem; background: rgba(255,255,255,0.05); border-radius: 6px; border: 1px solid rgba(255,255,255,0.1);">
                <small style="color: var(--accent-color); text-transform: uppercase; font-size: 0.7rem; font-weight: 600; letter-spacing: 0.05em;">Hierarchy Context</small>
                <div style="margin-top: 0.25rem; font-size: 0.85rem; color: var(--text-secondary);">
                    ${d.ancestors().reverse().map(n => n.data.name).join(' <span style="opacity:0.5; margin:0 4px;">›</span> ')}
                </div>
            </div>
        `;
        panel.classList.remove('hidden');
    }

    // Handle window resize
    window.addEventListener('resize', () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        svg.attr('width', newWidth).attr('height', newHeight);
        treeMap.size([newHeight, newWidth * 0.8]);
        update(root);
    });
});
