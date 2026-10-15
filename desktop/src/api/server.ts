/**
 * Which Sonare backend the app talks to. The build picks it (VITE_API_BASE, see vite.config.ts);
 * there is no setting for it in the app.
 */
export const API_BASE: string = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:3010/api/v1';
