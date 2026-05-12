import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, ClipboardCheck, ArrowRight } from 'lucide-react';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">
      <div className="landing-content">
        <div className="landing-header">
          <h1>Factors Behind A Successful Security Awareness Program</h1>
          <p>Explore the success factors of security culture or assess your organization's maturity.</p>
        </div>

        <div className="cards-container">
          <div className="landing-card" onClick={() => navigate('/mindmap')}>
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

          <div className="landing-card" onClick={() => navigate('/assessment')}>
            <div className="card-icon-wrapper assessment-icon">
              <ClipboardCheck size={40} />
            </div>
            <h2>Maturity Assessment</h2>
            <p>Evaluate your awareness program against the key success factors and identify areas for improvement.</p>
            <div className="card-action">
              <span>Start Audit</span>
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
