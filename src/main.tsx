import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './style.css';
import './index.css';
import { initSentry } from './lib/sentry';
import { installGlobalErrorHandlers } from './lib/monitoring';

// Initialize error monitoring before rendering so the ErrorBoundary and the
// global handlers capture errors via Sentry from the very first render.
initSentry();
installGlobalErrorHandlers();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
