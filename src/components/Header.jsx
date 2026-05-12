
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Header = ({ onAboutClick, onResetZoom }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [allNodes, setAllNodes] = useState([]);
    const [filteredNodes, setFilteredNodes] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const searchRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const dataPath = `${import.meta.env.BASE_URL}data.json`;
        fetch(dataPath)
            .then(res => res.json())
            .then(data => {
                const nodes = [];
                const traverse = (node) => {
                    if (node.name) nodes.push(node.name);
                    if (node.children) node.children.forEach(traverse);
                };
                traverse(data);
                // Remove duplicates and sort
                setAllNodes([...new Set(nodes)].sort());
            })
            .catch(err => console.error("Error loading search data", err));

        // Click outside to close dropdown
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearchChange = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.trim() === '') {
            setFilteredNodes([]);
            setIsDropdownOpen(false);
        } else {
            const matches = allNodes.filter(n => n.toLowerCase().includes(query.toLowerCase()));
            setFilteredNodes(matches);
            setIsDropdownOpen(true);
        }
    };

    const handleSelectNode = (nodeName) => {
        setSearchQuery(nodeName);
        setIsDropdownOpen(false);
        window.dispatchEvent(new CustomEvent('focus-node', { detail: nodeName }));
    };

    return (
        <header className="header-content-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '1.5rem 2rem', position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 10, pointerEvents: 'none' }}>
            <div className="header-content" style={{ pointerEvents: 'auto' }}>
                <h1>Factors Behind A Successful Security Awareness Program</h1>
                <p>Interactive Mindmap of Success Factors</p>
                
                <div className="search-container" ref={searchRef} style={{ marginTop: '1rem', position: 'relative', width: '300px' }}>
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={() => { if (searchQuery.trim() !== '') setIsDropdownOpen(true) }}
                        placeholder="Search factors..."
                        style={{
                            width: '100%',
                            padding: '0.6rem 1rem',
                            borderRadius: '999px',
                            border: '1px solid var(--panel-border)',
                            background: 'rgba(255, 255, 255, 0.9)',
                            backdropFilter: 'blur(10px)',
                            fontSize: '0.9rem',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            boxShadow: 'var(--shadow-sm)',
                            fontFamily: 'Inter, sans-serif'
                        }}
                    />
                    {isDropdownOpen && filteredNodes.length > 0 && (
                        <ul className="search-dropdown" style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: '0.5rem',
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: 'var(--shadow-md)',
                            maxHeight: '250px',
                            overflowY: 'auto',
                            listStyle: 'none',
                            padding: '0.5rem 0',
                            zIndex: 30
                        }}>
                            {filteredNodes.map((n, i) => (
                                <li 
                                    key={i} 
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        handleSelectNode(n);
                                    }}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        borderBottom: i < filteredNodes.length - 1 ? '1px solid #f1f5f9' : 'none'
                                    }}
                                    onMouseOver={(e) => e.target.style.background = '#f1f5f9'}
                                    onMouseOut={(e) => e.target.style.background = 'white'}
                                >
                                    {n}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            <div className="controls" style={{ pointerEvents: 'auto', display: 'flex', gap: '0.5rem' }}>
                <button id="home-btn" className="btn" onClick={() => navigate('/Home')}>Home</button>
                <button id="about-btn" className="btn" onClick={onAboutClick}>About</button>
                <button id="nav-assess-btn" className="btn" onClick={() => navigate('/assessment')}>Assessment</button>
                <button id="reset-zoom" className="btn" onClick={onResetZoom}>Reset View</button>
            </div>
        </header>
    );
};

export default Header;
