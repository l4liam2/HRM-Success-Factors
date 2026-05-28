import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, ClipboardCheck, ArrowRight, Sun, Moon } from 'lucide-react';

function LandingPage() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

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

  return (
    <div className="landing-container">
      <button 
        className="theme-toggle-btn" 
        onClick={toggleTheme} 
        aria-label="Toggle dark mode"
        style={{ 
          position: 'absolute',
          top: '2rem',
          right: '2rem',
          zIndex: 10,
          background: 'var(--node-fill)',
          border: '1px solid var(--panel-border)',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          cursor: 'pointer',
          boxShadow: 'var(--shadow-sm)',
          color: 'var(--text-primary)',
          transition: 'all 0.2s ease'
        }}
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      <div className="landing-content">
        <div className="landing-header">
          <h1>Factors Behind A Successful Security Awareness Program</h1>
          <p>Explore the success factors of security culture or assess your organization's maturity.</p>
        </div>

        <div className="cards-container">
          <div className="landing-card mindmap-card" onClick={() => navigate('/mindmap')}>
            <div className="card-icon-wrapper mindmap-icon">
              <Network size={40} />
            </div>
            <h2>Success Factors Mind Map</h2>
            <p>Visually explore the interconnected concepts and drivers that build a robust security culture.</p>
            <div className="card-action">
              <span>Explore Map</span>
              <ArrowRight size={20} />
            </div>
          </div>

          <div className="landing-card assessment-card" onClick={() => navigate('/assessment')} style={{ position: 'relative' }}>
            <div className="coming-soon-badge-card" style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(79, 70, 229, 0.1)',
                color: 'var(--accent-color)',
                padding: '0.25rem 0.75rem',
                borderRadius: '99px',
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
            }}>
                Coming Soon
            </div>
            <div className="card-icon-wrapper assessment-icon">
              <ClipboardCheck size={40} />
            </div>
            <h2>Maturity Assessment</h2>
            <p>Evaluate your awareness program against the key success factors and identify areas for improvement.</p>
            <div className="card-action">
              <span>Coming Soon</span>
              <ArrowRight size={20} />
            </div>
          </div>
        </div>
      </div>
      <div className="copyright-notice" style={{ position: 'absolute', bottom: '1.5rem' }}>
        &copy; 2026 EduRisk Inc. All Rights Reserved
      </div>
    </div>
  );
}

export default LandingPage;
