import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, ClipboardCheck, ArrowRight, Sun, Moon, Info } from 'lucide-react';
import AboutModal from './AboutModal';

function LandingPage() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [isAboutOpen, setIsAboutOpen] = useState(false);

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
          <h1>Security Awareness Program Success Factors</h1>
          <p>Explore the success factors of security culture or assess your organization's maturity.</p>
          <button
            onClick={() => setIsAboutOpen(true)}
            style={{
              marginTop: '1rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--node-fill)',
              border: '1px solid var(--panel-border)',
              borderRadius: '999px',
              padding: '0.5rem 1.25rem',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              boxShadow: 'var(--shadow-sm)',
              transition: 'all 0.2s ease'
            }}
          >
            <Info size={16} />
            About the Project
          </button>
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
            <div className="card-icon-wrapper assessment-icon">
              <ClipboardCheck size={40} />
            </div>
            <h2>Maturity Assessment</h2>
            <p>Evaluate your awareness program against the key success factors and identify areas for improvement.</p>
            <div className="card-action">
              <span>Take Assessment</span>
              <ArrowRight size={20} />
            </div>
          </div>
        </div>
      </div>
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
      <div className="copyright-notice" style={{ position: 'absolute', bottom: '1.5rem' }}>
        &copy; 2026 <a href="https://www.edurisk.ca/" target="_blank" rel="noopener noreferrer">EduRisk</a> Inc. All Rights Reserved
      </div>
    </div>
  );
}

export default LandingPage;
