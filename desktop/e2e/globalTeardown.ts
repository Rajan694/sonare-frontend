import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const globalTeardown = async () => {
  const bePid = (globalThis as any).__BACKEND_PID__;
  const fePid = (globalThis as any).__VITE_PID__;

  if (bePid) {
    try {
      process.kill(bePid, 'SIGTERM');
    } catch {}
  }
  if (fePid) {
    try {
      process.kill(fePid, 'SIGTERM');
    } catch {}
  }

  // Delete node_modules/.vite-5199 if exists
  const viteCache = path.resolve(__dirname, '../node_modules/.vite-5199');
  if (fs.existsSync(viteCache)) {
    fs.rmSync(viteCache, { recursive: true, force: true });
  }
};

export default globalTeardown;
