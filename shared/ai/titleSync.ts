// Sends the songs whose titles look messy (shared/catalog/titleFixes.ts) to the backend in
// batches and remembers the cleaner titles it answers with, across restarts too. Each app starts
// this once with its own request and storage functions.

import type { AiTitleFixes } from "../apiTypes.js";
import {
  addTitleFixes,
  takePendingTitles,
  titleFixesSnapshot,
  type PendingTitle,
  type TitleFix,
} from "../catalog/titleFixes.js";

export interface TitleSyncDeps {
  /** POST /ai/titles with `{ items }`. */
  post: (items: PendingTitle[]) => Promise<AiTitleFixes>;
  /** False while AI is off (app-config `ai`) or the app is offline: nothing is sent. */
  enabled: () => boolean;
  /** Saved fixes from an earlier run, if any. */
  load?: () => Promise<Record<string, TitleFix> | null>;
  save?: (fixes: Record<string, TitleFix>) => Promise<void>;
  intervalMs?: number;
}

const BATCH = 40;
const SAVE_EVERY_MS = 30_000;

/** Starts the loop; returns a function that stops it. */
export const startTitleSync = (deps: TitleSyncDeps): (() => void) => {
  const { post, enabled, load, save, intervalMs = 4000 } = deps;
  let stopped = false;
  let busy = false;
  let dirty = false;
  let lastSave = 0;

  void load?.()
    .then((saved) => {
      if (saved && typeof saved === "object") addTitleFixes(saved);
    })
    .catch(() => {});

  const tick = async () => {
    if (stopped || busy || !enabled()) return;
    const items = takePendingTitles(BATCH);
    if (items.length > 0) {
      busy = true;
      try {
        const { fixes } = await post(items);
        if (fixes && Object.keys(fixes).length > 0) {
          addTitleFixes(fixes);
          dirty = true;
        }
      } catch {
        // Asked again later (takePendingTitles spaces the tries).
      } finally {
        busy = false;
      }
    }
    if (dirty && save && Date.now() - lastSave > SAVE_EVERY_MS) {
      dirty = false;
      lastSave = Date.now();
      void save(titleFixesSnapshot()).catch(() => {});
    }
  };

  const timer = setInterval(() => void tick(), intervalMs);
  return () => {
    stopped = true;
    clearInterval(timer);
  };
};
