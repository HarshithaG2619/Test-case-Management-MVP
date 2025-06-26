import React, { useState } from 'react';
import HomeView from './views/HomeView';
import ProjectView from './views/ProjectView';
import './index.css';

/**
 * Main App component - handles routing
 */
const App = () => {
  const [currentView, setCurrentView] = useState('home');
  const [selectedProject, setSelectedProject] = useState(null);

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    setCurrentView('project');
  };

  const handleBackToHome = () => {
    setSelectedProject(null);
    setCurrentView('home');
  };

  switch (currentView) {
    case 'project':
      return (
        <ProjectView
          project={selectedProject}
          onBack={handleBackToHome}
        />
      );
    case 'home':
    default:
      return (
        <HomeView
          onProjectSelect={handleProjectSelect}
        />
      );
  }
};

export default App; 