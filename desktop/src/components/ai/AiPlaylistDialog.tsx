import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/api';
import { showToast } from '../../store/toasts';
import { transition } from '../../lib/motion';
import Button from '../ui/Button';
import Icon from '../ui/Icon';
import { Field } from '../ui/Field';
import { Segmented } from '../ui/Segmented';
import { AI_PLAYLIST_SIZES, createAiPlaylist } from './aiPlaylist';

type Step = { at: 'form'; error?: string } | { at: 'asking' } | { at: 'finding'; searched: number; total: number };

const BUSY = 'AI is busy right now. Try again later.';

/** "Create with AI" on the Playlists screen: describe a playlist, the AI picks the songs. */
export const AiPlaylistDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<number>(25);
  const [step, setStep] = useState<Step>({ at: 'form' });
  const controller = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    controller.current?.abort();
    controller.current = null;
    setStep({ at: 'form' });
    onClose();
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      closeRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  const text = prompt.trim();
  const busy = step.at !== 'form';

  const create = async () => {
    if (text.length < 3 || busy) return;
    const mine = new AbortController();
    controller.current = mine;
    setStep({ at: 'asking' });
    try {
      const result = await createAiPlaylist({
        prompt: text,
        count: size,
        signal: mine.signal,
        onProgress: (searched, total) => !mine.signal.aborted && setStep({ at: 'finding', searched, total }),
      });
      if (mine.signal.aborted) return;
      if (result.kind === 'too-few') {
        setStep({ at: 'form', error: "Couldn't find enough of those songs. Try describing it differently." });
        return;
      }
      setPrompt('');
      close();
      navigate(`/playlist/${result.playlist.id}`);
      showToast(
        result.kind === 'created'
          ? {
              title: `Made ${result.playlist.name}`,
              description: `${result.songs} songs`,
              icon: 'playlist',
              variant: 'acc',
            }
          : { title: 'The playlist was made but its songs couldn’t be added', icon: 'info' },
      );
    } catch (err) {
      if (mine.signal.aborted) return;
      const message =
        err instanceof ApiError && err.code === 'RATE_LIMITED'
          ? err.message
          : err instanceof ApiError && err.code !== 'AI_UNAVAILABLE' && err.status < 500
            ? err.message
            : BUSY;
      setStep({ at: 'form', error: message });
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition.fast}
        >
          <div className="scrim" aria-hidden onPointerDown={close} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-playlist-title"
            className="relative w-full max-w-[440px] bg-s2 border border-ln2 rounded-xl shadow-e4 p-6 flex flex-col gap-5"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={transition.normal}
          >
            <div className="flex flex-col gap-1.5">
              <h2
                id="ai-playlist-title"
                className="inline-flex items-center gap-2 text-title-l text-t1 font-semibold m-0"
              >
                <Icon name="sparkles" size={18} className="text-acc" />
                Create with AI
              </h2>
              <p className="text-body-m text-t2 m-0">
                Describe a mood, an occasion or a sound, and the AI picks the songs.
              </p>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-label-m text-t2">Describe the playlist</span>
              <Field
                ref={inputRef}
                square
                value={prompt}
                placeholder="e.g. Rainy evening, Hindi acoustic"
                maxLength={300}
                disabled={busy}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void create()}
              />
            </label>

            <div className="flex items-center justify-between gap-3">
              <span className="text-label-m text-t2">Songs</span>
              <Segmented
                options={AI_PLAYLIST_SIZES.map((n) => ({ id: String(n), label: String(n) }))}
                value={String(size)}
                onChange={(id) => !busy && setSize(Number(id))}
              />
            </div>

            {step.at === 'form' && step.error && (
              <p className="text-body-s text-red m-0" role="alert">
                {step.error}
              </p>
            )}
            {busy && (
              <p className="inline-flex items-center gap-2 text-body-s text-t2 m-0" role="status">
                <Icon name="sync" size={14} className="animate-spin" />
                {step.at === 'finding' ? `Finding songs… ${step.searched} of ${step.total}` : 'Asking AI…'}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                Cancel
              </Button>
              <Button type="button" variant="acc" disabled={busy || text.length < 3} onClick={() => void create()}>
                Create
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
