import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import '@fontsource-variable/fraunces/wght-italic.css';
import '@fontsource-variable/jetbrains-mono';
import './styles/themes.css';
import './styles/base.css';
import './styles/glass.css';
import App from './App';
import { hydrate } from './store/store';
import { requestPersistentStorage } from './lib/db';
import { isNative } from './lib/platform';
import { back } from './lib/router';

// Apply a theme before first paint to avoid a flash.
document.documentElement.dataset.theme = 'vermilion';
document.documentElement.dataset.mode = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

hydrate().then(() => requestPersistentStorage());

// Offline support for the web build (the Android app bundles its files, so it needs no service worker).
// The hosted browser preview runs in a sandboxed frame where service workers aren't available.
if ('serviceWorker' in navigator && !isNative() && import.meta.env.PROD && !import.meta.env.VITE_PREVIEW) {
  window.addEventListener('load', () =>
    navigator.serviceWorker
      .register('./sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        // The scripts, styles and fonts of this first visit loaded before the worker existed, so it never saw them.
        // Hand it the list so the app also opens offline right after the first visit.
        const urls = performance.getEntriesByType('resource').map((e) => e.name).filter((u) => u.startsWith(location.origin + '/'));
        reg.active?.postMessage({ type: 'cache', urls });
      })
      .catch((e) => console.warn('SW registration failed', e)),
  );
}

// Android hardware back button → in-app back navigation.
if (isNative()) {
  import('@capacitor/app')
    .then(({ App: CapApp }) =>
      CapApp.addListener('backButton', ({ canGoBack }) => {
        const root = ['#/discover', '#/journeys', '#/create', '#/you', ''].includes(location.hash);
        if (root && !canGoBack) CapApp.minimizeApp();
        else back();
      }),
    )
    .catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
