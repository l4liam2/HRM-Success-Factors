
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const MindMap = ({ onNodeSelect }) => {
    const svgRef = useRef(null);

    useEffect(() => {
        if (!svgRef.current) return;

        // Clear previous SVG content if any (React strict mode re-renders)
        d3.select(svgRef.current).selectAll("*").remove();

        const width = window.innerWidth;
        const height = window.innerHeight;

        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height)
            .on('dblclick.zoom', null); // Disable double click zoom

        const g = svg.append('g');

        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Initial transform
        // Initial transform
        const isMobile = window.innerWidth < 768;
        const initialScale = isMobile ? 0.6 : 1;
        const initialTranslateX = isMobile ? window.innerWidth / 3 : 150;

        svg.call(zoom.transform, d3.zoomIdentity.translate(initialTranslateX, height / 2).scale(initialScale));

        // Reset Zoom Handler (Exposed via window or we could pass a ref to Header? 
        // To keep it simple for migration without Context, we'll listen to a custom event or just let React handle buttons.
        // Actually, the original code had buttons in HTML. In React, Header has buttons. 
        // We can export a reset function or expose it via ref context, but simpler: 
        // We will listen to a window event 'reset-zoom' for now, or just implement it later in a cleaner way.
        // For now, let's keep the D3 logic self-contained.)

        // Better React pattern: use useImperativeHandle or props. For now, we'll just focus on rendering.

        const treeMap = d3.tree().nodeSize([110, 350]);
        let root;
        let i = 0;
        const duration = 500;

        const dataPath = `${import.meta.env.BASE_URL}data.json`;
        d3.json(dataPath).then(data => {
            const filterNode = (node) => {
                if (!node) return null;
                const filteredNode = { ...node };
                if (node.children) {
                    filteredNode.children = node.children
                        .filter(c => c.name !== "Maturity stages")
                        .map(filterNode);
                }
                return filteredNode;
            };
            const filteredData = filterNode(data);
            root = d3.hierarchy(filteredData, d => d.children);
            root.x0 = height / 2;
            root.y0 = 0;

            // Collapse all children initially
            if (root.children) {
                root.children.forEach(collapse);
            }

            update(root);
        });

        function collapse(d) {
            if (d.children) {
                d._children = d.children;
                d._children.forEach(collapse);
                d.children = null;
            }
        }

        function update(source) {
            const treeData = treeMap(root);
            const nodes = treeData.descendants();
            const links = treeData.links();

            // Normalize for fixed-depth
            nodes.forEach(d => { d.y = d.depth * 350; });

            // ****************** Nodes section ******************
            const node = g.selectAll('g.node')
                .data(nodes, d => d.id || (d.id = ++i));

            const nodeEnter = node.enter().append('g')
                .attr('class', 'node')
                .attr('transform', d => `translate(${source.y0},${source.x0})`)
                .on('click', click);


            // Icons
            const icons = {
                "Human Cognition": "M15.5 12c2.5 0 4.5 2 4.5 4.5S18 21 15.5 21 11 19 11 16.5 13 12 15.5 12zM15.5 14a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM10.5 4a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zM10.5 6a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM5.5 12C8 12 10 14 10 16.5S8 21 5.5 21 1 19 1 16.5 3 12 5.5 12zM5.5 14a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
                "Pedagogical Design": "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
                "Organisational Governance & Culture": "M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z",
                "Metrics & Impact Measurement": "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z",
                "Coping and Efficacy": "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z",
                "Behavioural Drivers": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
                "Behavioural Drivers_alt": "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z",
                "Cognitive Barriers": "M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z",
                "Delivery Frequency": "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z",
                "Engagement Methods": "M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-1.99.9-1.99 2v3.8H3.5c1.49 0 2.7 1.21 2.7 2.7s-1.21 2.7-2.7 2.7H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.49 1.21-2.7 2.7-2.7 1.49 0 2.7 1.21 2.7 2.7V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z",
                "Content Tailoring": "M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z",
                "Evaluation Methods": "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z",
                "Executive Leadership": "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
                "Organisational Culture": "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
                "Policy Framework": "M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z",
                "User Centric Design": "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
                "Success Measurement": "M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z",
                "Maturity stages": "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H5v-4h4v-4h4v-3h6v11z",
                "default": "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z M11 7h2v6h-2zm0 8h2v2h-2z"
            };

            const getIcon = (d) => {
                const name = d.data.name;
                if (icons[name]) return icons[name];
                if (name === "Behavioural Drivers") return "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z";
                if (d.depth === 1) return icons["Organisational Governance & Culture"];
                if (d.data.children) return "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2v-3h2v3zm4 0h-2v-5h2v5z";
                return icons.default;
            };

            const trackColors = {
                "Human Cognition": "#8B5CF6", // Vibrant Purple
                "Pedagogical Design": "#10B981", // Emerald Green
                "Organisational Governance & Culture": "#F59E0B", // Amber
                "Metrics & Impact Measurement": "#EC4899", // Pink
                "default": "#94A3B8"
            };

            const getTrackColor = (d) => {
                if (d.depth === 0) return "var(--accent-color)";
                let trackNode = d;
                while (trackNode.depth > 1) {
                    trackNode = trackNode.parent;
                }
                const trackName = trackNode.data.name;
                return trackColors[trackName] || trackColors.default;
            };

            // Root Node (Circle)
            const rootNode = nodeEnter.filter(d => d.depth === 0);
            rootNode.append('circle')
                .attr('r', 65)
                .style("fill", "#FFFFFF")
                .style("stroke", "var(--accent-color)")
                .style("stroke-width", "4px")
                .style("filter", "drop-shadow(0 0 15px rgba(59, 130, 246, 0.3))");

            rootNode.append('text')
                .attr("class", "root-node-text")
                .attr("dy", "0.3em")
                .attr("text-anchor", "middle")
                .text(d => d.data.name)
                .style("font-size", "11px")
                .style("font-weight", "800")
                .style("text-transform", "uppercase")
                .each(function (d) { wrap(d3.select(this), 110) });

            // Child Node (Rect)
            const childNode = nodeEnter.filter(d => d.depth > 0);
            childNode.append('rect')
                .attr('width', 220)
                .attr('height', 80)
                .attr('x', -110)
                .attr('y', -40)
                .attr('rx', 12)
                .attr('ry', 12)
                .style("fill", d => {
                    const color = d3.color(getTrackColor(d));
                    if (color) {
                        color.opacity = 0.08;
                        return color;
                    }
                    return "#FFFFFF";
                })
                .style("stroke", d => getTrackColor(d))
                .style("stroke-width", "2px")
                .style("filter", "drop-shadow(0 4px 6px rgba(0,0,0,0.05))");

            childNode.append('path')
                .attr('d', d => getIcon(d))
                .attr('fill', d => getTrackColor(d))
                .attr('transform', 'translate(-95, -12) scale(1.2)')
                .style("opacity", 1);

            childNode.append('text')
                .attr("dy", "0.32em")
                .attr("x", -65)
                .attr("text-anchor", "start")
                .text(d => d.data.name)
                .style("fill", "var(--text-primary)")
                .style("font-size", "11px")
                .style("font-weight", "700")
                .style("text-transform", "uppercase")
                .style("letter-spacing", "0.05em")
                .each(function (d) { wrap(d3.select(this), 150) });

            // Info Icon Group (Appended last to ensure z-index ON TOP)
            const infoGroup = nodeEnter.append('g')
                .attr('transform', 'translate(90, -23)') // Lowered to -18
                .attr('cursor', 'pointer')
                .style("opacity", 0)
                // Hide for root node AND leaf nodes
                .style("display", d => (d.depth === 0 || (!d.children && !d._children)) ? "none" : "block")
                .on('click', (event, d) => {
                    event.stopPropagation();
                    if (onNodeSelect) onNodeSelect(d);
                });

            infoGroup.transition().duration(duration).style("opacity", 1);

            infoGroup.append('circle')
                .attr('r', 9)
                .attr('fill', 'transparent')
                .attr('stroke', '#cbd5e1') // Discreet gray
                .attr('stroke-width', 1.5)
                .transition().duration(duration); // Transition support

            infoGroup.append('text')
                .text('i')
                .attr('dy', '0.35em')
                .attr('text-anchor', 'middle')
                .style('fill', '#94a3b8') // Matching text
                .style('font-size', '11px')
                .style('font-weight', 'bold')
                .style('font-family', 'serif');

            // Merge
            const nodeUpdate = node.merge(nodeEnter);
            nodeUpdate.classed("node--collapsed", d => d._children);
            nodeUpdate.transition().duration(duration)
                .attr('transform', d => `translate(${d.y},${d.x})`);

            nodeUpdate.select('rect')
                .style("fill", null)
                .attr('cursor', 'pointer');

            nodeUpdate.select('text')
                .style("fill-opacity", 1);

            // Ensure info icon stays visible/updated and respects root/leaf hiding, and correct position
            nodeUpdate.select('g')
                .style("opacity", 1)
                .style("display", d => (d.depth === 0 || (!d.children && !d._children)) ? "none" : "block")
                .attr('transform', 'translate(90, -23)');

            const nodeExit = node.exit().transition().duration(duration)
                .attr('transform', d => `translate(${source.y},${source.x})`)
                .remove();

            nodeExit.select('rect').attr('width', 1e-6).attr('height', 1e-6);
            nodeExit.select('text').style("fill-opacity", 1e-6);
            nodeExit.select('g').style("opacity", 1e-6); // Fade out info icon

            // Links
            const link = g.selectAll('path.link')
                .data(links, d => d.target.id);

            const linkEnter = link.enter().insert('path', "g")
                .attr("class", "link")
                .attr('d', d => {
                    const o = { x: source.x0, y: source.y0 };
                    return diagonal(o, o);
                })
                .style("stroke", d => getTrackColor(d.target));

            const linkUpdate = link.merge(linkEnter);
            linkUpdate.transition().duration(duration)
                .attr('d', d => diagonal(d.source, d.target))
                .style("stroke", d => getTrackColor(d.target));

            link.exit().transition().duration(duration)
                .attr('d', d => {
                    const o = { x: source.x, y: source.y };
                    return diagonal(o, o);
                })
                .remove();

            nodes.forEach(d => {
                d.x0 = d.x;
                d.y0 = d.y;
            });

            function diagonal(s, d) {
                return `M ${s.y} ${s.x}
                C ${(s.y + d.y) / 2} ${s.x},
                  ${(s.y + d.y) / 2} ${d.x},
                  ${d.y} ${d.x}`;
            }

            function click(event, d) {
                // Separate Click Logic:
                // Main body click -> Toggle Children ONLY (unless Leaf Node)
                // (Info icon click handled above -> Open Details)

                // If Leaf Node (no children to toggle), assume user wants Details
                if (!d.children && !d._children) {
                    if (onNodeSelect) onNodeSelect(d);
                    return;
                }

                // Toggle children
                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                } else if (d._children) {
                    d.children = d._children;
                    d._children = null;
                }
                update(d);
            }
        }

        // Wrap Helper
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

                while ((word = words.pop())) {
                    line.push(word);
                    tspan.text(line.join(" "));
                    if (tspan.node().getComputedTextLength() > width) {
                        line.pop();
                        tspan.text(line.join(" "));
                        line = [word];
                        tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                    }
                }
                if (lineNumber > 0) {
                    const shift = -(lineNumber * lineHeight) / 2;
                    text.selectAll("tspan").attr("dy", function (d, i) {
                        return (i * lineHeight + dy + shift) + "em";
                    });
                }
            });
        }

        // Resize Handler
        const handleResize = () => {
            svg.attr('width', window.innerWidth).attr('height', window.innerHeight);
            if (root) update(root);
        };
        window.addEventListener('resize', handleResize);

        // Focus Node Handler
        const handleFocusNode = (e) => {
            const targetName = e.detail;
            if (!root) return;
            
            // Find the node by traversing both expanded and collapsed branches
            let targetNode = null;
            const findNode = (node) => {
                if (node.data.name === targetName) {
                    targetNode = node;
                    return;
                }
                if (node.children) node.children.forEach(findNode);
                if (node._children) node._children.forEach(findNode);
            };
            findNode(root);
            
            if (targetNode) {
                // Expand all parents
                let current = targetNode.parent;
                while (current) {
                    if (current._children) {
                        current.children = current._children;
                        current._children = null;
                    }
                    current = current.parent;
                }
                // Call update on root so the layout recalculates properly
                update(root);
                
                // Zoom to node
                const width = window.innerWidth;
                const height = window.innerHeight;
                const scale = 1.2;
                
                // In D3 tree, d.y is the horizontal position and d.x is the vertical position
                const tx = -targetNode.y * scale + width / 3; 
                const ty = -targetNode.x * scale + height / 2;
                
                svg.transition().duration(750).call(
                    zoom.transform,
                    d3.zoomIdentity.translate(tx, ty).scale(scale)
                );
                
                // Open Details Panel
                if (onNodeSelect) onNodeSelect(targetNode);
            }
        };
        window.addEventListener('focus-node', handleFocusNode);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('focus-node', handleFocusNode);
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array = run once on mount

    // Expose Zoom Reset if needed via event listener in useEffect or ref. 
    // For now we will attach a window listener for the 'reset-zoom' custom event
    useEffect(() => {
        const handleResetZoom = () => {
            if (!svgRef.current) return;
            const svg = d3.select(svgRef.current);
            const width = window.innerWidth;
            const height = window.innerHeight;
            // We need 'zoom' instance. Since it's inside, we might need to recreate or store it.
            // Re-selecting zoom behavior from SVG node:
            // d3 stores zoom transform on the node, but the behavior 'zoom' function is needed to transform.
            // Easiest is to move zoom definition up or re-create generic zoom identity.
            // Actually we can transition the transform.

            svg.transition().duration(750).call(
                // We need the zoom behavior instance to call zoom.transform. 
                // Since we defined it inside, we can't access it easily here without refactoring.
                // Let's refactor the previous useEffect to store zoom in a ref? 
                // Or just define a new zoom behavior matching the old one (same scale extent).
                d3.zoom().on("zoom", (e) => d3.select(svgRef.current).select('g').attr('transform', e.transform)).transform,
                d3.zoomIdentity.translate(width / 2, height / 2).scale(1)
            );
        };

        window.addEventListener('reset-zoom', handleResetZoom);
        return () => window.removeEventListener('reset-zoom', handleResetZoom);
    }, []);

    return <svg ref={svgRef} id="visualization"></svg>;
};

export default MindMap;
