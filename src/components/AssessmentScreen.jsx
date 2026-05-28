import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Award, CheckCircle, Sun, Moon } from 'lucide-react';

function AssessmentScreen() {
  const SHOW_ASSESSMENT_CONTENT = false; // Toggle to true when ready to show
  const navigate = useNavigate();
  const [maturityLevels, setMaturityLevels] = useState([]);
  const [selectedLevelIdx, setSelectedLevelIdx] = useState(null);
  const [expandedLevels, setExpandedLevels] = useState({ 0: true });
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

  useEffect(() => {
    const dataPath = `${import.meta.env.BASE_URL}data.json`;
    fetch(dataPath)
      .then(res => res.json())
      .then(data => {
        const findMaturity = (node) => {
          if (node.name === "Maturity stages") {
            return node.children || [];
          }
          if (node.children) {
            for (const child of node.children) {
              const res = findMaturity(child);
              if (res && res.length > 0) return res;
            }
          }
          return [];
        };
        const levels = findMaturity(data);
        setMaturityLevels(levels);
      })
      .catch(err => console.error("Error loading assessment data", err));
  }, []);

  const toggleExpand = (idx) => {
    setExpandedLevels(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleSelectLevel = (idx) => {
    setSelectedLevelIdx(idx);
    setExpandedLevels(prev => ({
      ...prev,
      [idx]: true,
      [idx + 1]: idx < 4 ? true : prev[idx + 1]
    }));
  };

  const getCleanLevelName = (name) => {
    return name.includes(':') ? name.split(':')[1].trim() : name;
  };

  if (!SHOW_ASSESSMENT_CONTENT) {
    return (
      <div className="assessment-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', textAlign: 'center', position: 'relative' }}>
        <button 
          className="back-btn" 
          onClick={() => navigate('/Home')} 
          style={{ 
            position: 'absolute',
            top: '2rem',
            left: '2rem',
            zIndex: 10,
            background: 'var(--node-fill)',
            border: '1px solid var(--panel-border)',
            padding: '0.5rem 1.2rem',
            borderRadius: '999px',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-sm)',
            fontFamily: 'Inter, sans-serif',
            transition: 'all 0.2s ease'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Home</span>
        </button>
        
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

        <div className="coming-soon-card" style={{
            background: 'var(--panel-bg)',
            backdropFilter: 'blur(12px)',
            border: '1px solid var(--panel-border)',
            borderRadius: '24px',
            padding: '4rem 3rem',
            maxWidth: '500px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            transform: 'translateY(-20px)'
        }}>
            <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(79, 70, 229, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-color)',
                marginBottom: '0.5rem'
            }}>
                <Award size={32} />
            </div>
            <h2 style={{ 
                fontSize: '2.2rem', 
                fontWeight: 800, 
                margin: 0,
                background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--accent-color) 100%)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '-0.02em'
            }}>
                Maturity Audit
            </h2>
            <div style={{
                background: 'rgba(79, 70, 229, 0.1)',
                color: 'var(--accent-color)',
                padding: '0.4rem 1.2rem',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
            }}>
                Coming Soon
            </div>
            <p style={{ 
                color: 'var(--text-secondary)', 
                fontSize: '1rem', 
                lineHeight: '1.6', 
                margin: '0 0 1rem 0',
                fontFamily: 'Inter, sans-serif'
            }}>
                We are crafting an interactive benchmarking audit to help you evaluate and track the maturity of your organization's cybersecurity awareness program. Stay tuned!
            </p>
            <button 
                className="btn-select-level" 
                onClick={() => navigate('/Home')}
                style={{
                    background: 'var(--accent-color)',
                    color: 'white',
                    border: 'none',
                    padding: '0.8rem 2rem',
                    borderRadius: '999px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Inter, sans-serif'
                }}
            >
                Return to Dashboard
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="assessment-container" style={{ minHeight: '100vh', padding: '2rem 1.5rem', overflow: 'hidden', position: 'relative' }}>
      <button 
        className="back-btn" 
        onClick={() => navigate('/Home')} 
        style={{ 
          position: 'absolute',
          top: '2rem',
          left: '2rem',
          zIndex: 10,
          background: 'var(--node-fill)',
          border: '1px solid var(--panel-border)',
          padding: '0.5rem 1.2rem',
          borderRadius: '999px',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          boxShadow: 'var(--shadow-sm)',
          fontFamily: 'Inter, sans-serif',
          transition: 'all 0.2s ease'
        }}
      >
        <ArrowLeft size={16} />
        <span>Back to Home</span>
      </button>

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

      <div className="assessment-layout">
        <div className="assessment-intro">
          <h2 style={{ background: 'linear-gradient(135deg, var(--text-primary) 0%, var(--text-secondary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Security Awareness Maturity Roadmap</h2>
          <p>
            Assess your organisation's current cybersecurity culture maturity against industry standards and view custom steps to level up.
          </p>
        </div>

        {/* Self-Assessment Banner */}
        {maturityLevels.length > 0 && (
          <div 
            className={`self-assessment-banner ${selectedLevelIdx === null ? 'unrated' : ''}`}
            style={{ 
              background: selectedLevelIdx !== null 
                ? 'linear-gradient(135deg, var(--accent-color), var(--secondary-accent))' 
                : undefined
            }}
          >
            <div className="self-assessment-info">
              <h3>
                {selectedLevelIdx !== null 
                  ? `Assessed: ${getCleanLevelName(maturityLevels[selectedLevelIdx].name)}` 
                  : 'Evaluate Your Program'}
              </h3>
              {selectedLevelIdx !== null ? (
                selectedLevelIdx < 4 ? (
                  <p style={{ color: 'rgba(255, 255, 255, 0.85)' }}>
                    Currently at Level {selectedLevelIdx + 1}. To transition to <strong>{getCleanLevelName(maturityLevels[selectedLevelIdx + 1].name)}</strong>, focus on the action items listed in Level {selectedLevelIdx + 2} below.
                  </p>
                ) : (
                  <p style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Congratulations! Your program is fully optimized. Focus on data-driven sustainment and adaptive learning.</p>
                )
              ) : (
                <p>Select your current maturity level in the timeline cards below to define your progression path.</p>
              )}
            </div>
            <div className="self-assessment-result">
              {selectedLevelIdx !== null ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Award size={24} style={{ color: '#FCD34D' }} />
                  <span className="self-assessment-badge">Level {selectedLevelIdx + 1}</span>
                </div>
              ) : (
                <span className="self-assessment-badge" style={{ background: 'var(--text-secondary)' }}>Unrated</span>
              )}
            </div>
          </div>
        )}

        {/* Timeline Roadmap */}
        {maturityLevels.length > 0 && (
          <div className="timeline-roadmap">
            <div className="timeline-line-container">
              <div 
                className="timeline-line-highlight"
                style={{ 
                  height: selectedLevelIdx !== null 
                    ? `${(selectedLevelIdx / (maturityLevels.length - 1)) * 100}%` 
                    : '0%' 
                }}
              />
            </div>

            {maturityLevels.map((level, idx) => {
              const isOpen = !!expandedLevels[idx];
              const isSelected = selectedLevelIdx === idx;
              const isPassed = selectedLevelIdx !== null && idx < selectedLevelIdx;
              
              const levelNumber = idx + 1;
              const levelName = level.name;
              
              return (
                <div 
                  key={levelName} 
                  className={`timeline-item ${isSelected ? 'active-level' : ''} ${isPassed ? 'passed-level' : ''}`}
                >
                  <div className="timeline-badge">
                    {isPassed ? <CheckCircle size={16} style={{ color: 'white' }} /> : levelNumber}
                  </div>
                  
                  <div 
                    className="timeline-panel"
                    onClick={() => toggleExpand(idx)}
                  >
                    <div className="timeline-panel-header">
                      <div className="timeline-level-name">
                        {levelName}
                      </div>
                      
                      <div className="timeline-panel-actions" onClick={(e) => e.stopPropagation()}>
                        {isSelected ? (
                          <span className="level-status-tag current">Current</span>
                        ) : isPassed ? (
                          <span className="level-status-tag completed">Achieved</span>
                        ) : null}
                        
                        <button 
                          className="btn-select-level"
                          onClick={() => handleSelectLevel(idx)}
                          style={{
                            backgroundColor: isSelected ? 'var(--accent-color)' : '',
                            color: isSelected ? 'white' : '',
                            border: isSelected ? '1px solid var(--accent-color)' : ''
                          }}
                        >
                          {isSelected ? 'Selected' : 'Set Active'}
                        </button>
                        
                        <span 
                          className={`toggle-arrow ${isOpen ? 'expanded' : ''}`}
                          onClick={() => toggleExpand(idx)}
                        >
                          ▼
                        </span>
                      </div>
                    </div>
                    
                    {isOpen && (
                      <div className="timeline-panel-body" onClick={(e) => e.stopPropagation()}>
                        <div className="level-tldr">
                          <strong>TL;DR:</strong> {level.tldr}
                        </div>
                        
                        <div className="level-description">
                          {level.description}
                        </div>
                        
                        <div className="level-section-grid">
                          <div>
                            <h4 className="level-section-title">Key Transition Action Items</h4>
                            <ul className="level-action-items">
                              {level.actionItems && level.actionItems.map((item, i) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h4 className="level-section-title">Critical KPIs to Track</h4>
                            <div className="level-kpis">
                              {level.kpis && level.kpis.map((kpi, i) => (
                                <span key={i} className="level-kpi-badge">{kpi}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default AssessmentScreen;
