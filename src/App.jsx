import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import MindMapScreen from './components/MindMapScreen';
import AssessmentScreen from './components/AssessmentScreen';

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, []);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Navigate to="/Home" replace />} />
        <Route path="/Home" element={<LandingPage />} />
        <Route path="/mindmap" element={<MindMapScreen />} />
        <Route path="/assessment" element={<AssessmentScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
