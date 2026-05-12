import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock } from 'lucide-react';

function AssessmentScreen() {
  const navigate = useNavigate();

  return (
    <div className="assessment-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <button className="back-btn" onClick={() => navigate('/Home')} style={{ alignSelf: 'flex-start' }}>
        <ArrowLeft size={20} />
        <span>Back to Home</span>
      </button>

      <div className="results-card" style={{ maxWidth: '600px', marginTop: '4rem' }}>
        <Clock size={64} className="success-icon" style={{ color: 'var(--text-secondary)' }} />
        <h2>Maturity Assessment</h2>
        <p className="results-desc" style={{ marginBottom: '0' }}>
          This space is reserved for the upcoming Human-Centric Security Maturity Assessment.
          Check back soon to evaluate your organization's security awareness program.
        </p>
      </div>
    </div>
  );
}

export default AssessmentScreen;
