import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { WindowControls } from './components/WindowControls';
import { useAuthStore } from './stores/authStore';

function AppWithAuth() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return <App />;
}

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <AppWithAuth />
      {/* Mount target for window controls; rendered conditionally below */}
      <div id="__window_controls_mount" style={{ display: 'none' }} />
    </React.StrictMode>
  );

  // If running inside Electron, render the WindowControls into the TopNavBar
  if ((window as any).windowControls) {
    const target = document.getElementById('window-controls-root');
    if (target) {
      try { createRoot(target).render(<WindowControls />); } catch {}
    }
  }
}
