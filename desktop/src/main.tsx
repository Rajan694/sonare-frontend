import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { installErrorReporting } from './lib/errorReporting';
import { initNeutralino } from './neutralino';
import { Root } from './Root';
import './styles.css';

// Neutralino has to be initialised before any window/tray/os call is made.
initNeutralino();
installErrorReporting();

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container #root is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
