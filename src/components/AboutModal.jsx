
import React from 'react';

const AboutModal = ({ isOpen, onClose }) => {
    return (
        <div id="about-modal" className={`modal-overlay ${isOpen ? '' : 'hidden'}`} onClick={onClose}>
            <div className="glass-panel modal-content" onClick={(e) => e.stopPropagation()}>
                <button id="close-about" aria-label="Close about" onClick={onClose}>&times;</button>
                <h2>About the Project</h2>
                <div className="modal-body">
                    <p>This interactive mind map visualizes the key factors behind a successful security awareness
                        program.</p>
                    <p>Explore the hierarchy to understand how different components like Gamification, Culture, and
                        Communication contribute to building a robust security posture.</p>
                    <p>Double-click nodes to expand/collapse them, and click to view detailed information in the side
                        panel.</p>
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
