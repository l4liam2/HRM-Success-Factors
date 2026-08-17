import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Rnd } from 'react-rnd';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { findCitation, autoLinkCitations } from './bibliographyData';

const DetailsPanel = ({ node, isOpen, onClose }) => {
    const [hoveredCitation, setHoveredCitation] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    // Tracked by node name rather than as a bare boolean, so opening another factor
    // starts collapsed instead of inheriting the previous one's "Show Less" state.
    const [expandedFor, setExpandedFor] = useState(null);
    const [shouldTruncate, setShouldTruncate] = useState(false);
    const contentRef = useRef(null);
    const descriptionRef = useRef(null);

    const nodeName = node?.data?.name;
    const isExpanded = expandedFor != null && expandedFor === nodeName;

    // Citations left as plain text in the content get the same link + tooltip treatment
    // as the hand-tagged ones.
    const linkedDescription = useMemo(() => autoLinkCitations(node?.data?.description), [node?.data?.description]);
    const linkedExamples = useMemo(() => autoLinkCitations(node?.data?.examples), [node?.data?.examples]);
    const linkedTldr = useMemo(() => autoLinkCitations(node?.data?.tldr), [node?.data?.tldr]);

    // Check if overview description overflows after rendering or when description changes
    useEffect(() => {
        if (!isOpen || !node || !descriptionRef.current) return;

        const handleResize = () => {
            if (descriptionRef.current) {
                // 130px threshold for description height
                const hasOverflow = descriptionRef.current.scrollHeight > 130;
                setShouldTruncate(hasOverflow);
            }
        };

        // Run checking
        handleResize();
        
        // Also check if contents changed or window resized
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isOpen, node, node?.data?.description]);

    const markdownComponents = {
        a: ({ node, ...props }) => {
            if (node && props.className === 'citation') {
                return (
                    <a
                        {...props}
                        onMouseEnter={(e) => {
                            const linkText = e.currentTarget.textContent || "";
                            // Only the text immediately after the link, for narrative citations that
                            // leave the year outside it. The whole paragraph would drag in every
                            // other citation's year and resolve to the wrong entry.
                            const trailing = (e.currentTarget.nextSibling?.textContent || "").slice(0, 24);
                            const sourceText = findCitation(linkText, trailing);
                            if (sourceText) {
                                setHoveredCitation(sourceText);
                                const rect = e.currentTarget.getBoundingClientRect();
                                setTooltipPos({
                                    x: rect.left + rect.width / 2,
                                    y: rect.bottom + 8
                                });
                            }
                        }}
                        onMouseLeave={() => setHoveredCitation(null)}
                    />
                );
            }
            return <a {...props} />;
        }
    };

    if (!node) return null;

    const { data, parent, depth } = node;
    const { name, description, tldr, examples, children, actionItems, kpis, maturityLevels } = data;

    const isMaturityStage = name.startsWith("Level ") || (parent && parent.data && parent.data.name === "Maturity stages");

    // Determine Drivers / Sub-Factors
    let listTitle = "Key Drivers / Sub-Factors";
    let targetNodes = [];

    if (!isMaturityStage) {
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
    }

    // Construct breadcrumbs (skip root node for brevity if depth > 0)
    const getBreadcrumbs = (n) => {
        const path = [];
        let current = n;
        while (current) {
            if (current.depth > 0) {
                path.unshift(current.data.name);
            }
            current = current.parent;
        }
        return path;
    };
    const breadcrumbs = getBreadcrumbs(node);

    return (
        <>
            <Rnd
                default={{
                    x: typeof window !== 'undefined' ? window.innerWidth - 450 : 0,
                    y: typeof window !== 'undefined' ? window.innerHeight * 0.1 : 0,
                    width: 420,
                    height: 600,
                }}
                minWidth={300}
                minHeight={300}
                bounds="window"
                dragHandleClassName="panel-header"
                className={`glass-panel-rnd ${isOpen ? '' : 'hidden'}`}
                style={{ zIndex: 20, position: 'absolute' }}
            >
                <div className="panel-inner" key={name}>
                    <div className="panel-header">
                        {breadcrumbs.length > 1 && (
                            <div className="breadcrumbs" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {breadcrumbs.slice(0, -1).join(' › ')}
                            </div>
                        )}
                        <h2 id="panel-title">{name}</h2>
                        <button id="close-panel" aria-label="Close details" onClick={onClose}>&times;</button>
                    </div>
                    
                    <div id="panel-content" ref={contentRef}>
                        {tldr && (
                            <div className="tldr-box">
                                <strong>TL;DR:</strong> <span dangerouslySetInnerHTML={{ __html: linkedTldr }} />
                            </div>
                        )}

                        {description ? (
                            <div className="content-section">
                                <h3 className="section-title">Overview</h3>
                                <div className={`overview-wrapper ${shouldTruncate ? 'has-fade' : ''} ${shouldTruncate && !isExpanded ? 'collapsed' : ''}`}>
                                    <div 
                                        ref={descriptionRef}
                                        className="description markdown-body overview-content"
                                        style={{
                                            maxHeight: shouldTruncate && !isExpanded ? '130px' : 'none',
                                            overflow: 'hidden'
                                        }}
                                    >
                                        <ReactMarkdown rehypePlugins={[rehypeRaw]} components={markdownComponents}>{linkedDescription}</ReactMarkdown>
                                    </div>
                                </div>
                                {shouldTruncate && (
                                    <button 
                                        className="overview-expand-btn"
                                        onClick={() => setExpandedFor(isExpanded ? null : nodeName)}
                                        aria-expanded={isExpanded}
                                    >
                                        {isExpanded ? (
                                            <>
                                                Show Less <ChevronUp size={14} style={{ marginLeft: '4px' }} />
                                            </>
                                        ) : (
                                            <>
                                                Read More <ChevronDown size={14} style={{ marginLeft: '4px' }} />
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <p className="placeholder">
                                Explore concepts related to <strong>{name}</strong> in the Framework via sources.
                            </p>
                        )}

                        {examples && (
                            <div className="content-section">
                                <h3 className="section-title">Practical Examples</h3>
                                <div className="description markdown-body">
                                    <ReactMarkdown rehypePlugins={[rehypeRaw]} components={markdownComponents}>{linkedExamples}</ReactMarkdown>
                                </div>
                            </div>
                        )}

                        {kpis && kpis.length > 0 && !isMaturityStage && (
                            <div className="content-section">
                                <h3 className="section-title">Key Performance Indicators</h3>
                                <div className="kpi-container">
                                    {kpis.map((kpi, i) => (
                                        <span key={i} className="kpi-badge">{kpi}</span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {actionItems && actionItems.length > 0 && !isMaturityStage && (
                            <div className="content-section">
                                <h3 className="section-title">Action Items</h3>
                                <ul className="action-items-list">
                                    {actionItems.map((item, i) => (
                                        <li key={i}>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {maturityLevels && maturityLevels.level1 && maturityLevels.level5 && (
                            <div className="content-section">
                                <h3 className="section-title">Maturity Scale</h3>
                                <div className="maturity-grid">
                                    <div className="maturity-box level-1">
                                        <h4>Level 1: Reactive</h4>
                                        <p>{maturityLevels.level1}</p>
                                    </div>
                                    <div className="maturity-box level-5">
                                        <h4>Level 5: Optimized</h4>
                                        <p>{maturityLevels.level5}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {targetNodes.length > 0 && (
                            <div style={{ marginTop: '1.5rem' }}>
                                <label className="panel-section-label">{listTitle}</label>
                                <ul className="driver-list">
                                    {targetNodes.map((child, index) => (
                                        <li 
                                            key={index} 
                                            className="driver-item"
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => {
                                                window.dispatchEvent(new CustomEvent('focus-node', { detail: child.name }));
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    window.dispatchEvent(new CustomEvent('focus-node', { detail: child.name }));
                                                }
                                            }}
                                        >
                                            <span
                                                className="driver-dot"
                                                style={{ backgroundColor: depth === 0 ? "var(--accent-color)" : undefined }}
                                            ></span>
                                            {child.name}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </Rnd>
            {hoveredCitation && (
                <div 
                    className="citation-tooltip animate-fade-in"
                    style={{
                        position: 'fixed',
                        left: `${tooltipPos.x}px`,
                        top: `${tooltipPos.y}px`,
                        transform: 'translateX(-50%)',
                        background: 'var(--panel-bg)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid var(--panel-border)',
                        color: 'var(--text-primary)',
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-lg)',
                        fontSize: '0.8rem',
                        lineHeight: '1.4',
                        maxWidth: '280px',
                        zIndex: 9999,
                        pointerEvents: 'none',
                        fontFamily: 'Inter, sans-serif'
                    }}
                >
                    {hoveredCitation}
                </div>
            )}
        </>
    );
};

export default DetailsPanel;
