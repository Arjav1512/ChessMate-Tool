import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
// Ivory design tokens (System Design §5) — additive; loaded before legacy
// styles. Disjoint from the `--cm-*` Obsidian system in style.css, so the
// shipping app is visually unchanged until screens are cut over.
import './styles/tokens.css';
import './styles/globals.css';
import './style.css';
import './index.css';
import { initSentry } from './lib/sentry';
import { installGlobalErrorHandlers } from './lib/monitoring';
import { installSignOutCleanup } from './lib/clearUserState';
import { useThemeStore, applyThemeAttributes } from './stores/themeStore';

// Initialize error monitoring before rendering so the ErrorBoundary and the
// global handlers capture errors via Sentry from the very first render.
initSentry();
installGlobalErrorHandlers();
// Purge query cache / user localStorage / SW api-response cache on sign-out
// (any sign-out: button, token expiry, another tab) — audit M2.
installSignOutCleanup();

// Reflect the persisted theme onto <html> before first paint so the Ivory
// token cascade (landing, auth, and the authenticated shell) opens in the
// user's chosen light/dark mode with no flash.
applyThemeAttributes(useThemeStore.getState());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
