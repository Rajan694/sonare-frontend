import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { isNeutralino } from './lib/caps';
import { installErrorReporting } from './lib/errorReporting';
import { Root } from './Root';
import './styles.css';

installErrorReporting();

const render = () => {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Root container #root is missing from index.html');
  }
  createRoot(container).render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );
};

// Neutralino has to be initialised before any window/tray/os call is made, so a Neutralino page (the
// desktop window, or `./runFE.sh web`) loads it and only then renders. The plain web build never loads it.
if (isNeutralino()) {
  void import('./neutralino').then(({ initNeutralino }) => {
    initNeutralino();
    render();
  });
} else {
  render();
}
