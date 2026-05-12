import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import MindMapScreen from './components/MindMapScreen';
import AssessmentScreen from './components/AssessmentScreen';

function App() {
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
