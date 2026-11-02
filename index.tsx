import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// A deploy replaces hashed chunks; an open tab then fails to import the old ones. Reload once to pick up the new build.
const RELOAD_KEY = 'chunk-reload-at';
window.addEventListener('vite:preloadError', (event) => {
  const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  if (Date.now() - last < 10_000) return;
  sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  event.preventDefault();
  window.location.reload();
});

const rootElement =document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);