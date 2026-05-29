import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { bibliography } from './bibliographyData';

const BibliographyModal = ({ isOpen, onClose }) => {
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    // Filter bibliography items based on search query
    const filteredBib = bibliography.filter(entry => 
        entry.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div id="bibliography-modal" className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div className="glass-panel modal-content bibliography-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', width: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <button id="close-bibliography" aria-label="Close bibliography" onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '1.5rem', cursor: 'pointer', zIndex: 10 }}>
                    <X size={20} />
                </button>
                
                <h2 style={{ marginBottom: '0.5rem' }}>Research Bibliography</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                    A full list of the academic literature, frameworks, and success factors referenced in this interactive mind map.
                </p>

                {/* Bibliography Search bar */}
                <div className="bib-search-container" style={{ position: 'relative', marginBottom: '1rem', width: '100%' }}>
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
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search bibliography (author, title, year...)"
                        style={{
                            width: '100%',
                            padding: '0.6rem 1rem 0.6rem 2.5rem',
                            borderRadius: '8px',
                            border: '1px solid var(--panel-border)',
                            background: 'var(--node-fill)',
                            fontSize: '0.9rem',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            boxShadow: 'var(--shadow-sm)',
                            fontFamily: 'Inter, sans-serif'
                        }}
                    />
                </div>

                {/* Bibliography List */}
                <div className="bibliography-list-container" style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                    {filteredBib.length > 0 ? (
                        <ol className="bib-list" style={{ paddingLeft: '1.5rem', margin: 0 }}>
                            {filteredBib.map((entry, index) => (
                                <li key={index} className="bib-item" style={{ fontSize: '0.825rem', lineHeight: '1.5', marginBottom: '1rem', color: 'var(--text-primary)', paddingLeft: '0.25rem' }}>
                                    {entry}
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)', padding: '2rem 0' }}>
                            No matching bibliography entries found.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BibliographyModal;
