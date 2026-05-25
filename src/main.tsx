import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './style.css';
import './index.css';
import { initSentry } from './lib/sentry';

// Initialize error monitoring before rendering so the ErrorBoundary
// can capture errors via Sentry from the very first render.
initSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
