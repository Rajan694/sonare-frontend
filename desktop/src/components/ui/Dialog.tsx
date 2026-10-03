import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useOpenDialog, type OpenDialog } from '../../store/dialogs';
import { useMyPlaylists } from '../../api/hooks';
import { addTracksWithToast, createPlaylistNamed } from '../../api/newPlaylist';
import { transition } from '../../lib/motion';
import { cn } from '../../lib/cn';
import Button from './Button';
import Icon from './Icon';
import Artwork from '../music/Artwork';
import { Field } from './Field';

/** Renders the dialog opened with promptDialog / confirmDialog (store/dialogs.ts). */
export function DialogHost() {
  const dialog = useOpenDialog();
  return (
    <AnimatePresence>
      {dialog && (
        <motion.div
          key={dialog.id}
          className="fixed inset-0 z-[60] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition.fast}
        >
          <div className="scrim" aria-hidden onPointerDown={() => cancel(dialog)} />
          <motion.div
            role={dialog.kind === 'confirm' ? 'alertdialog' : 'dialog'}
            aria-modal="true"
            aria-labelledby={`dialog-${dialog.id}-title`}
            className="relative w-full max-w-[400px] bg-s2 border border-ln2 rounded-xl shadow-e4 p-6 flex flex-col gap-5"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={transition.normal}
          >
            {dialog.kind === 'prompt' ? (
              <PromptBody dialog={dialog} />
            ) : dialog.kind === 'confirm' ? (
              <ConfirmBody dialog={dialog} />
            ) : (
              <AddToPlaylistBody dialog={dialog} />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function cancel(dialog: OpenDialog) {
  if (dialog.kind === 'prompt') dialog.resolve(null);
  else if (dialog.kind === 'confirm') dialog.resolve(false);
  else dialog.resolve();
}

function useEscape(dialog: OpenDialog) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      // Keeps Escape from also reaching the player shortcuts / menus underneath.
      e.stopPropagation();
      cancel(dialog);
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [dialog]);
}

function Heading({ id, title, description }: { id: string; title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 id={id} className="text-title-l text-t1 font-semibold m-0">
        {title}
      </h2>
      {description && <p className="text-body-m text-t2 m-0">{description}</p>}
    </div>
  );
}

function PromptBody({ dialog }: { dialog: Extract<OpenDialog, { kind: 'prompt' }> }) {
  const { options } = dialog;
  const [value, setValue] = useState(options.initialValue ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  useEscape(dialog);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) dialog.resolve(value);
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={submit}>
      <Heading id={`dialog-${dialog.id}-title`} title={options.title} description={options.description} />
      <label className="flex flex-col gap-2">
        {options.label && <span className="text-label-m text-t2">{options.label}</span>}
        <Field
          ref={inputRef}
          square
          value={value}
          placeholder={options.placeholder}
          maxLength={options.maxLength ?? 100}
          onChange={(e) => setValue(e.target.value)}
          aria-label={options.label ?? options.title}
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => dialog.resolve(null)}>
          Cancel
        </Button>
        <Button type="submit" variant="acc" disabled={!value.trim()}>
          {options.confirmLabel ?? 'Save'}
        </Button>
      </div>
    </form>
  );
}

function ConfirmBody({ dialog }: { dialog: Extract<OpenDialog, { kind: 'confirm' }> }) {
  const { options } = dialog;
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEscape(dialog);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  return (
    <>
      <Heading id={`dialog-${dialog.id}-title`} title={options.title} description={options.description} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => dialog.resolve(false)}>
          {options.cancelLabel ?? 'Cancel'}
        </Button>
        <Button
          ref={confirmRef}
          type="button"
          variant={options.danger ? 'solid' : 'acc'}
          className={cn(options.danger && 'bg-red text-white border-transparent hover:bg-red hover:brightness-110')}
          onClick={() => dialog.resolve(true)}
        >
          {options.confirmLabel ?? 'OK'}
        </Button>
      </div>
    </>
  );
}

function AddToPlaylistBody({ dialog }: { dialog: Extract<OpenDialog, { kind: 'addToPlaylist' }> }) {
  const { tracks } = dialog;
  const { data, loading } = useMyPlaylists();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  useEscape(dialog);
  const playlists = data?.items ?? [];
  const what = tracks.length === 1 ? tracks[0].title : `${tracks.length} songs`;

  async function addTo(p: { id: string; name: string }) {
    setBusy(true);
    const ok = await addTracksWithToast(p, tracks);
    setBusy(false);
    if (ok) dialog.resolve();
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const created = await createPlaylistNamed(name.trim());
    setBusy(false);
    if (created) await addTo(created);
  }

  return (
    <>
      <Heading id={`dialog-${dialog.id}-title`} title="Add to playlist" description={what} />
      <form className="flex gap-2" onSubmit={createAndAdd}>
        <Field
          square
          icon="plus"
          className="grow"
          value={name}
          placeholder="New playlist name"
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          aria-label="New playlist name"
        />
        <Button type="submit" variant="acc" disabled={!name.trim() || busy}>
          Create
        </Button>
      </form>
      <div className="flex flex-col gap-0.5 max-h-[280px] overflow-auto -mx-2">
        {loading && playlists.length === 0 ? (
          <span className="text-body-s text-t3 px-2 py-3">Loading playlists…</span>
        ) : playlists.length === 0 ? (
          <span className="text-body-s text-t3 px-2 py-3">No playlists yet — name one above.</span>
        ) : (
          playlists.map((p, i) => (
            <button
              key={p.id}
              type="button"
              disabled={busy}
              onClick={() => void addTo(p)}
              className="flex items-center gap-3 px-2 py-1.5 rounded-sm bg-transparent border-0 cursor-pointer text-left hover:bg-s3 disabled:opacity-60"
            >
              <Artwork src={p.thumbnail} alt="" variant={`a${(i % 12) + 1}` as 'a1'} size={36} radius="xs" />
              <span className="flex flex-col min-w-0 grow">
                <span className="text-label-l text-t1 truncate">{p.name}</span>
                <span className="text-label-s text-t3">
                  {p.trackCount ?? 0} {p.trackCount === 1 ? 'song' : 'songs'}
                </span>
              </span>
              <Icon name="plus" size={16} className="text-t3 flex-none" />
            </button>
          ))
        )}
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="ghost" onClick={() => dialog.resolve()}>
          Done
        </Button>
      </div>
    </>
  );
}
