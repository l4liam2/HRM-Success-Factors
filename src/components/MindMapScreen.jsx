import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import MindMap from './MindMap';
import DetailsPanel from './DetailsPanel';
import AboutModal from './AboutModal';

function MindMapScreen() {
  const [activeNode, setActiveNode] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const navigate = useNavigate();

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

  const handleResetZoom = () => {
    // Dispatch custom event for D3 component to pick up
    window.dispatchEvent(new Event('reset-zoom'));
  };

  return (
    <div className="app-container">
      <Header
        onAboutClick={handleAboutClick}
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

      <button
        id="assess-btn"
        className="discreet-link"
        onClick={() => navigate('/assessment')}
      >
        Want to assess the maturity of your awareness program? Try the Audit.
      </button>

      <div className="copyright-notice">
        &copy; 2026 EduRisk Inc. All Rights Reserved
      </div>
    </div>
  );
}

export default MindMapScreen;
