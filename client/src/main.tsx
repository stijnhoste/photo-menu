import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { APP_NAME, CANONICAL_URL } from './config';

document.title = APP_NAME;
let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
if (!canonical) {
  canonical = document.createElement('link');
  canonical.rel = 'canonical';
  document.head.appendChild(canonical);
}
canonical.href = `${CANONICAL_URL}${window.location.pathname}`;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
