import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let backendProc: ChildProcess;
let viteProc: ChildProcess;

// The backend's .env.test (sonare_test database, Redis db15), never the real .env.
const testEnv = (beDir: string): Record<string, string> => {
  const file = path.join(beDir, '.env.test');
  if (!fs.existsSync(file)) {
    throw new Error('Copy sonare-backend/.env.test.example to .env.test before running e2e');
  }
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  if (!/\/sonare_test$/.test(env.DATABASE_URL ?? '')) {
    throw new Error('sonare-backend/.env.test must point DATABASE_URL at sonare_test');
  }
  return { ...env, PORT: '3099' };
};

const globalSetup = async () => {
  const root = path.resolve(__dirname, '../../..');
  const beDir = path.join(root, 'sonare-backend');
  const feDir = path.join(root, 'sonare-frontend/desktop');

  console.log('[E2E Setup] Starting test backend on 3099...');
  backendProc = spawn('npx', ['tsx', 'src/server.ts'], {
    cwd: beDir,
    env: {
      ...process.env,
      PORT: '3099',
      ...testEnv(beDir),
    },
    stdio: 'ignore',
  });

  (globalThis as any).__BACKEND_PID__ = backendProc.pid;

  console.log('[E2E Setup] Starting test Vite on 5199...');
  viteProc = spawn('npm', ['run', 'dev'], {
    cwd: feDir,
    env: {
      ...process.env,
      SONARE_VITE_PORT: '5199',
      SONARE_NL_PORT: '1',
      VITE_API_BASE: 'http://127.0.0.1:3099/api/v1',
    },
    stdio: 'ignore',
  });

  (globalThis as any).__VITE_PID__ = viteProc.pid;

  // Poll for servers
  let attempts = 0;
  while (attempts < 30) {
    try {
      const resBe = await fetch('http://127.0.0.1:3099/api/v1/healthz');
      const resFe = await fetch('http://127.0.0.1:5199');
      if (resBe.ok && resFe.ok) {
        console.log('[E2E Setup] Both servers ready!');
        return;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
    attempts++;
  }
  console.log('[E2E Setup] Servers initialized.');
};

export default globalSetup;
