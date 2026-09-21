import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { initNeutralino } from './neutralino';
import './styles.css';

// Neutralino has to be initialised before any window/tray/os call is made.
initNeutralino();

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
