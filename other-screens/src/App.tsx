import type { MouseEvent } from 'react';

import { os } from '@neutralinojs/lib';

import { isNeutralino } from './neutralino';

import styles from './App.module.css';

function openExternal(url: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    void os.open(url);
  };
}

export default function App() {
  return (
    <main className={styles.app}>
      <h1 className={styles.greeting}>Hii Rajan!!!</h1>

      {isNeutralino() ? (
        <>
          <p className={styles.info}>
            {window.NL_APPID} is running on port {window.NL_PORT} inside {window.NL_OS}
          </p>
          <p className={styles.version}>
            server: v{window.NL_VERSION} &middot; client: v{window.NL_CVERSION}
          </p>
        </>
      ) : (
        <p className={styles.info}>Running as a plain web page (no Neutralino runtime).</p>
      )}

      <img className={styles.logo} src="/icons/logo.gif" alt="Neutralinojs" />

      <p className={styles.links}>
        <a href="https://neutralino.js.org/docs" onClick={openExternal('https://neutralino.js.org/docs')}>
          Docs
        </a>
        {' · '}
        <a href="https://www.youtube.com/c/CodeZri" onClick={openExternal('https://www.youtube.com/c/CodeZri')}>
          Video tutorial
        </a>
      </p>
    </main>
  );
}
