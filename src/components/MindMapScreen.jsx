import React, { useState, useEffect } from 'react';
import Header from './Header';
import MindMap from './MindMap';
import DetailsPanel from './DetailsPanel';
import AboutModal from './AboutModal';
import BibliographyModal from './BibliographyModal';
import { BookOpen } from 'lucide-react';

function MindMapScreen() {
  const [activeNode, setActiveNode] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isBibliographyOpen, setIsBibliographyOpen] = useState(false);
  const [maturityStagesNode, setMaturityStagesNode] = useState(null);
  const [maturityLevels, setMaturityLevels] = useState([]);

  useEffect(() => {
    const dataPath = `${import.meta.env.BASE_URL}data.json`;
    fetch(dataPath)
      .then(res => res.json())
      .then(data => {
        let foundNode = null;
        const findMaturity = (node) => {
          if (node.name === "Maturity stages") {
            foundNode = node;
            return;
          }
          if (node.children) {
            node.children.forEach(findMaturity);
          }
        };
        findMaturity(data);
        if (foundNode) {
          setMaturityStagesNode(foundNode);
          setMaturityLevels(foundNode.children || []);
        }
      })
      .catch(err => console.error("Error loading data for maturity stepper", err));
  }, []);

  const handleSelectMaturityLevel = (level) => {
    if (!maturityStagesNode) return;

    const parentNodeOfMaturityStages = {
      data: { name: "Metrics & Impact Measurement" },
      depth: 1,
      parent: {
        data: { name: "Security Awareness Program Success Factors" },
        depth: 0,
        parent: null
      }
    };

    const maturityStagesMockNode = {
      data: maturityStagesNode,
      depth: 2,
      parent: parentNodeOfMaturityStages
    };

    const mockNode = {
      data: level,
      depth: 3,
      parent: maturityStagesMockNode
    };

    handleNodeSelect(mockNode);
  };

  const handleNodeSelect = (node) => {
    setActiveNode(node);
    setIsPanelOpen(true);
  };

  const handleClosePanel = () => {
    setIsPanelOpen(false);
  };

  const handleAboutClick = () => {
    setIsAboutModalOpen(true);
  };

  const handleCloseAbout = () => {
    setIsAboutModalOpen(false);
  };

  const handleBibliographyClick = () => {
    setIsBibliographyOpen(true);
  };

  const handleCloseBibliography = () => {
    setIsBibliographyOpen(false);
  };

  const handleResetZoom = () => {
    // Dispatch custom event for D3 component to pick up
    window.dispatchEvent(new Event('reset-zoom'));
  };

  return (
    <div className="app-container">
      <Header
        onAboutClick={handleAboutClick}
        onBibliographyClick={handleBibliographyClick}
        onResetZoom={handleResetZoom}
      />

      <main className="iso-container">
        <MindMap onNodeSelect={handleNodeSelect} />
      </main>

      <DetailsPanel
        node={activeNode}
        isOpen={isPanelOpen}
        onClose={handleClosePanel}
      />

      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={handleCloseAbout}
      />

      <BibliographyModal
        isOpen={isBibliographyOpen}
        onClose={handleCloseBibliography}
      />

      {/* Floating Stepper for Maturity Stages */}
      {maturityLevels.length > 0 && (
        <div className="maturity-stepper-container">
          <div className="maturity-stepper-label">
            <span>Maturity Timeline</span>
            <span className="maturity-stepper-sub">Progression Benchmark</span>
          </div>
          <div className="maturity-stepper-steps">
            {maturityLevels.map((level, idx) => {
              const levelNumber = idx + 1;
              const shortName = level.name.replace(/^Level \d+:\s*/, '');
              const isActive = activeNode && activeNode.data && activeNode.data.name === level.name;
              return (
                <button
                  key={level.name}
                  className={`maturity-step-btn ${isActive ? 'active-step' : ''}`}
                  onClick={() => handleSelectMaturityLevel(level)}
                >
                  <span className="step-number">L{levelNumber}</span>
                  <span className="step-name">{shortName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hide the audit prompt until the feature is officially released */}
      {/* 
      <button
        id="assess-btn"
        className="discreet-link"
        onClick={() => navigate('/assessment')}
      >
        Want to assess the maturity of your awareness program? Try the Audit.
      </button> 
      */}

      <button 
        className="floating-bib-btn" 
        onClick={handleBibliographyClick}
        title="Open Bibliography"
      >
        <BookOpen size={16} />
        <span>Bibliography</span>
      </button>

      <div className="copyright-notice">
        &copy; 2026 <a href="https://www.edurisk.ca/" target="_blank" rel="noopener noreferrer">EduRisk</a> Inc. All Rights Reserved
      </div>
    </div>
  );
}

export default MindMapScreen;
