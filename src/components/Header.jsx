
import React from 'react';

const Header = ({ onAboutClick, onResetZoom }) => {
    return (
        <header className="header-content-wrapper">
            <div className="header-content">
                <h1>Factors Behind A Successful Security Awareness Program</h1>
                <p>Interactive Mindmap of Success Factors</p>
            </div>
            <div className="controls">
                <button id="about-btn" className="btn" onClick={onAboutClick}>About</button>
                <button id="reset-zoom" className="btn" onClick={onResetZoom}>Reset View</button>
            </div>
        </header>
    );
};

export default Header;
