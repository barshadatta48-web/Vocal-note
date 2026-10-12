import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerPWA } from './pwa';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthProvider } from './context/AuthContext';

console.log('[Bootstrap] Initializing Vocal Note application...');

// 1. Mount React application shell immediately
const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ErrorBoundary>
      </StrictMode>,
    );
    console.log('[Bootstrap] Application shell mounted to #root successfully.');
  } catch (renderError) {
    console.error('[Bootstrap Error] Failed to mount React application shell:', renderError);
  }
} else {
  console.error('[Bootstrap Error] Fatal: #root element missing from DOM.');
}

// 2. Safely register PWA Service Worker asynchronously without blocking UI render
const initServiceWorker = () => {
  console.log('[PWA] Checking service worker and manifest compatibility...');

  if (typeof window === 'undefined') {
    console.warn('[PWA] Window is undefined. Skipping SW registration.');
    return;
  }

  if (!('serviceWorker' in navigator)) {
    console.info('[PWA] Service Worker API not supported in this browser. Running in standard web mode.');
    return;
  }

  try {
    console.log('[PWA] Registering service worker in isolated error boundary...');
    registerPWA({
      onOnline: () => console.log('[PWA] Network status changed to: ONLINE'),
      onOffline: () => console.log('[PWA] Network status changed to: OFFLINE'),
      onUpdateAvailable: (reg) => console.log('[PWA] Service worker update available:', reg),
    });
  } catch (swError) {
    // Explicit error boundary for service worker registration
    console.error('[PWA Error Boundary] Service worker registration error caught in main.tsx:', swError);
    console.info('[PWA Error Boundary] Application shell will continue functioning normally without service worker.');
  }
};

// Defer SW registration to post-mount/idle time so application shell renders unconditionally
if (typeof window !== 'undefined') {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => initServiceWorker());
  } else {
    setTimeout(initServiceWorker, 100);
  }
}
