
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sun, Moon, Home, Info, ClipboardCheck, RefreshCw, BookOpen } from 'lucide-react';

const Header = ({ onAboutClick, onBibliographyClick, onResetZoom }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [allNodes, setAllNodes] = useState([]);
    const [filteredNodes, setFilteredNodes] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
    const searchRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => {
            const next = prev === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', next);
            return next;
        });
    };

    useEffect(() => {
        const dataPath = `${import.meta.env.BASE_URL}data.json`;
        fetch(dataPath)
            .then(res => res.json())
            .then(data => {
                const nodes = [];
                const traverse = (node) => {
                    if (node.name === "Maturity stages") return;
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
                <h1 style={{ background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Security Awareness Program Success Factors</h1>
                <p>Interactive Mindmap of Success Factors</p>
                
                <div className="search-container" ref={searchRef} style={{ marginTop: '1rem', position: 'relative', width: '300px' }}>
                    <Search 
                        size={16} 
                        style={{ 
                            position: 'absolute', 
                            left: '1rem', 
                            top: '50%', 
                            transform: 'translateY(-50%)', 
                            color: 'var(--text-secondary)',
                            pointerEvents: 'none',
                            opacity: 0.7
                        }} 
                    />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onFocus={() => { if (searchQuery.trim() !== '') setIsDropdownOpen(true) }}
                        placeholder="Search factors..."
                        style={{
                            width: '100%',
                            padding: '0.6rem 1rem 0.6rem 2.5rem',
                            borderRadius: '999px',
                            border: '1px solid var(--panel-border)',
                            background: 'var(--node-fill)',
                            fontSize: '0.9rem',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            boxShadow: 'var(--shadow-sm)',
                            fontFamily: 'Inter, sans-serif',
                            transition: 'all 0.2s ease'
                        }}
                    />
                    {isDropdownOpen && filteredNodes.length > 0 && (
                        <ul className="search-dropdown" style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: '0.5rem',
                            background: 'var(--node-fill)',
                            border: '1px solid var(--panel-border)',
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
                                        color: 'var(--text-primary)',
                                        borderBottom: i < filteredNodes.length - 1 ? '1px solid var(--panel-border)' : 'none'
                                    }}
                                    onMouseOver={(e) => e.target.style.background = 'rgba(99, 102, 241, 0.08)'}
                                    onMouseOut={(e) => e.target.style.background = 'transparent'}
                                >
                                    {n}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
            <div className="controls" style={{ pointerEvents: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button id="home-btn" className="btn" onClick={() => navigate('/Home')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Home size={14} />
                    <span>Home</span>
                </button>
                <button id="about-btn" className="btn" onClick={onAboutClick} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Info size={14} />
                    <span>About</span>
                </button>
                <button id="bibliography-btn" className="btn" onClick={onBibliographyClick} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <BookOpen size={14} />
                    <span>Bibliography</span>
                </button>
                {/* Hide the Assessment route button until released */}
                {/* 
                <button id="nav-assess-btn" className="btn" onClick={() => navigate('/assessment')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ClipboardCheck size={14} />
                    <span>Assessment</span>
                </button>
                */}
                <button id="reset-zoom" className="btn" onClick={onResetZoom} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <RefreshCw size={14} />
                    <span>Reset View</span>
                </button>
                <button 
                    id="theme-toggle" 
                    className="btn theme-toggle-btn" 
                    onClick={toggleTheme} 
                    aria-label="Toggle dark mode"
                    style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        width: '38px', 
                        height: '38px', 
                        padding: 0,
                        borderRadius: '50%',
                        cursor: 'pointer'
                    }}
                >
                    {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                </button>
            </div>
        </header>
    );
};

export default Header;
