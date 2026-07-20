
import React from 'react';

const AboutModal = ({ isOpen, onClose }) => {
    return (
        <div id="about-modal" className={`modal-overlay ${isOpen ? '' : 'hidden'}`} onClick={onClose}>
            <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
                <button id="close-about" aria-label="Close about" onClick={onClose}>&times;</button>
                <h2>About the Project</h2>
                <div className="modal-body">
                    <p>This site helps you understand and evaluate what makes a security awareness program
                        succeed.</p>
                    <p>The interactive mind map visualizes the key success factors — like Gamification, Culture, and
                        Communication — and how they connect to build a robust security posture. Double-click nodes to
                        expand or collapse them, and click a node to view detailed information in the side panel.</p>
                    <p>The maturity assessment asks a short set of questions across the same success factors, scores
                        your program on a five-level maturity scale, and lets you download your results as a PDF.</p>
                    <p
                        style={{ marginTop: '1rem', fontStyle: 'italic', color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                        This project is part of the <a href="https://cybersecurecatalyst.ca/fellowship-program/"
                            target="_blank" rel="noopener noreferrer"
                            style={{ color: 'inherit', textDecoration: 'underline' }}>Rogers Cybersecurity Catalyst Fellowship
                            program</a>. We would like to
                        thank all those involved for supporting us and allowing this project to occur.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AboutModal;
