import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import { addToPlaylistDialog, confirmDialog, promptDialog, cancelOpenDialog } from '../../src/store/dialogs';
import { Select } from '../../src/components/ui/Select';
import { useToasts } from '../../src/store/toasts';
import { setSession } from '../../src/api/auth';
import { renderWithProviders } from '../helpers/render';
import { dialogGone, listGone, openOptions } from '../helpers/dialogs';
import { API, apiError, http, HttpResponse, server, useMockServer } from '../helpers/server';
import { makePlaylist, makeTrack, page, testUser } from '../helpers/fixtures';

useMockServer();

const ToastTitles = () => {
  return (
    <ul aria-label="toasts">
      {useToasts().map((t) => (
        <li key={t.id}>{t.title}</li>
      ))}
    </ul>
  );
};

describe('dialogs', () => {
  it('WEB-DIALOG-001 a prompt suggests a name, submits the trimmed text with Enter, and closes', async () => {
    const { user } = renderWithProviders(<div />);
    let result: Promise<string | null>;
    act(() => {
      result = promptDialog({ title: 'New playlist', label: 'Name', initialValue: 'Mix', confirmLabel: 'Create' });
    });
    const dialog = await screen.findByRole('dialog', { name: 'New playlist' });
    const field = within(dialog).getByRole('textbox', { name: 'Name' });
    // The suggestion is selected, so typing replaces it.
    expect(field).toHaveValue('Mix');
    expect(field).toHaveFocus();
    await user.keyboard('  Late nights  {Enter}');
    await expect(result!).resolves.toBe('Late nights');
    await dialogGone();
  });

  it('WEB-DIALOG-002 a blank name cannot be submitted; Cancel, Escape and the backdrop all cancel', async () => {
    const { user } = renderWithProviders(<div />);
    let result!: Promise<string | null>;

    act(() => void (result = promptDialog({ title: 'Name it' })));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByRole('textbox'), '   ');
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeDisabled();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await expect(result).resolves.toBeNull();
    await dialogGone();

    act(() => void (result = promptDialog({ title: 'Name it' })));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    await expect(result).resolves.toBeNull();
    await dialogGone();

    act(() => void (result = promptDialog({ title: 'Name it' })));
    await screen.findByRole('dialog');
    await user.click(document.querySelector('.scrim')!);
    await expect(result).resolves.toBeNull();
  });

  it('WEB-DIALOG-003 Escape on a dialog does not reach the shortcuts underneath', async () => {
    const underneath = vi.fn();
    window.addEventListener('keydown', underneath);
    const { user } = renderWithProviders(<div />);
    act(() => void confirmDialog({ title: 'Sure?' }));
    await screen.findByRole('alertdialog');
    await user.keyboard('{Escape}');
    await dialogGone();
    expect(underneath).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
    window.removeEventListener('keydown', underneath);
  });

  it('WEB-DIALOG-004 a confirm shows its text, focuses the action, and answers true or false', async () => {
    const { user } = renderWithProviders(<div />);
    let answer!: Promise<boolean>;
    act(() => {
      answer = confirmDialog({
        title: 'Delete download?',
        description: '"Reckoner" is removed from its folder.',
        confirmLabel: 'Delete',
        danger: true,
      });
    });
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete download?' });
    expect(dialog).toHaveTextContent('"Reckoner" is removed from its folder.');
    expect(within(dialog).getByRole('button', { name: 'Delete' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await expect(answer).resolves.toBe(true);
    await dialogGone();

    act(() => void (answer = confirmDialog({ title: 'Again?' })));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Cancel' }));
    await expect(answer).resolves.toBe(false);
  });

  it('WEB-DIALOG-005 opening a dialog cancels the one already open; cancelOpenDialog closes it', async () => {
    renderWithProviders(<div />);
    let first!: Promise<string | null>;
    let second!: Promise<boolean>;
    act(() => void (first = promptDialog({ title: 'First' })));
    act(() => void (second = confirmDialog({ title: 'Second' })));
    await expect(first).resolves.toBeNull();
    expect(await screen.findByRole('alertdialog', { name: 'Second' })).toBeInTheDocument();
    act(() => cancelOpenDialog());
    await expect(second).resolves.toBe(false);
    await dialogGone();
  });

  it('WEB-DIALOG-006 the playlist picker adds the songs to a playlist and says so', async () => {
    setSession('a', 'r', testUser);
    let added: unknown;
    server.use(
      http.get(`${API}/me/playlists`, () =>
        HttpResponse.json(page([makePlaylist({ id: 'sonare:gym', name: 'Gym', trackCount: 3 })])),
      ),
      http.post(`${API}/me/playlists/:id/tracks`, async ({ params, request }) => {
        added = { id: params.id, body: await request.json() };
        return HttpResponse.json({ ok: true });
      }),
    );
    const track = makeTrack({ id: 'yt:reck', title: 'Reckoner' });
    const { user } = renderWithProviders(<ToastTitles />);
    let done!: Promise<void>;
    act(() => void (done = addToPlaylistDialog([track])));
    const dialog = await screen.findByRole('dialog', { name: 'Add to playlist' });
    expect(dialog).toHaveTextContent('Reckoner');
    await user.click(await within(dialog).findByRole('button', { name: /Gym/ }));
    await done;
    expect(added).toEqual({ id: 'sonare:gym', body: { trackIds: ['yt:reck'] } });
    expect(within(screen.getByRole('list', { name: 'toasts' })).getByText('Added to Gym')).toBeInTheDocument();
  });

  it('WEB-DIALOG-007 the picker creates a playlist by name and adds to it; failures keep it open', async () => {
    setSession('a', 'r', testUser);
    const calls: string[] = [];
    let failAdd = true;
    server.use(
      http.get(`${API}/me/playlists`, () => HttpResponse.json(page([]))),
      http.post(`${API}/me/playlists`, async ({ request }) => {
        calls.push(`create ${JSON.stringify(await request.json())}`);
        return HttpResponse.json(makePlaylist({ id: 'sonare:new', name: 'Late nights' }));
      }),
      http.post(`${API}/me/playlists/:id/tracks`, ({ params }) => {
        calls.push(`add ${params.id}`);
        return failAdd ? apiError(500, 'X') : HttpResponse.json({ ok: true });
      }),
    );
    const tracks = [makeTrack({ id: 'yt:a' }), makeTrack({ id: 'yt:b' })];
    const { user } = renderWithProviders(<ToastTitles />);
    act(() => void addToPlaylistDialog(tracks));
    const dialog = await screen.findByRole('dialog', { name: 'Add to playlist' });
    expect(dialog).toHaveTextContent('2 songs');
    expect(await within(dialog).findByText('No playlists yet — name one above.')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Create' })).toBeDisabled();

    await user.type(within(dialog).getByRole('textbox', { name: 'New playlist name' }), 'Late nights{Enter}');
    await waitFor(() => expect(calls).toEqual(['create {"name":"Late nights","kind":"synced"}', 'add sonare:new']));
    expect(await screen.findByText('Could not add to playlist')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    failAdd = false;
    await user.click(within(dialog).getByRole('button', { name: 'Create' }));
    await dialogGone();
    expect(within(screen.getByRole('list', { name: 'toasts' })).getByText('Added to Late nights')).toBeInTheDocument();
  });
});

const SPEEDS = [
  { value: 0.75, label: '0.75×' },
  { value: 1, label: '1×' },
  { value: 1.5, label: '1.5×' },
];

const Controlled = ({ onChange, onOpen }: { onChange?: (v: number) => void; onOpen?: () => void }) => {
  const [value, setValue] = useState(1);
  return (
    <Select
      ariaLabel="Playback speed"
      value={value}
      options={SPEEDS}
      onOpen={onOpen}
      onChange={(v) => {
        onChange?.(v);
        setValue(v);
      }}
    />
  );
};

describe('select', () => {
  it('WEB-SELECT-001 shows the chosen option; the list marks it and picking another changes it', async () => {
    const onChange = vi.fn();
    const onOpen = vi.fn();
    const { user } = renderWithProviders(<Controlled onChange={onChange} onOpen={onOpen} />);
    const trigger = screen.getByRole('button', { name: 'Playback speed' });
    expect(trigger).toHaveTextContent('1×');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(openOptions()).toEqual(['0.75×', '1×', '1.5×']);
    expect(screen.getByRole('option', { name: '1×' })).toHaveAttribute('aria-selected', 'true');
    await user.click(screen.getByRole('option', { name: '1.5×' }));
    await listGone();
    expect(onChange).toHaveBeenCalledWith(1.5);
    expect(trigger).toHaveTextContent('1.5×');
  });

  it('WEB-SELECT-002 picking the current option changes nothing', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(<Controlled onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Playback speed' }));
    await user.click(screen.getByRole('option', { name: '1×' }));
    await listGone();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('WEB-SELECT-003 works from the keyboard: arrows open and move, Enter picks, Escape closes back to the trigger', async () => {
    const onChange = vi.fn();
    const { user } = renderWithProviders(<Controlled onChange={onChange} />);
    const trigger = screen.getByRole('button', { name: 'Playback speed' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    const list = await screen.findByRole('listbox');
    expect(list).toHaveFocus();
    // Starts on the chosen option.
    expect(list).toHaveAttribute('aria-activedescendant', expect.stringMatching(/-1$/));
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(1.5);
    await listGone();

    await user.keyboard('{ArrowUp}');
    await screen.findByRole('listbox');
    await user.keyboard('{Home}{Enter}');
    expect(onChange).toHaveBeenLastCalledWith(0.75);
    await listGone();

    await user.click(trigger);
    await user.keyboard('{End}{Escape}');
    await listGone();
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(trigger).toHaveFocus();
  });

  it('WEB-SELECT-004 Space in the list picks instead of reaching the player shortcuts; a click outside closes it', async () => {
    const underneath = vi.fn();
    window.addEventListener('keydown', underneath);
    const onChange = vi.fn();
    const { user } = renderWithProviders(
      <>
        <Controlled onChange={onChange} />
        <button>elsewhere</button>
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Playback speed' }));
    await user.keyboard('{ArrowUp} ');
    expect(onChange).toHaveBeenCalledWith(0.75);
    expect(underneath).not.toHaveBeenCalled();
    window.removeEventListener('keydown', underneath);
    await listGone();

    await user.click(screen.getByRole('button', { name: 'Playback speed' }));
    await screen.findByRole('listbox');
    await user.click(screen.getByRole('button', { name: 'elsewhere' }));
    await listGone();
  });

  it('WEB-SELECT-005 a custom trigger and options with details and icons', async () => {
    const { user } = renderWithProviders(
      <Select
        ariaLabel="Audio output: Speakers"
        tip="Audio output"
        value="spk"
        options={[
          { value: '', label: 'System default', detail: 'Follows your system', icon: 'output' },
          { value: 'spk', label: 'Speakers', detail: 'Speaker', icon: 'speaker' },
        ]}
        onChange={() => {}}
        className="ib"
        renderTrigger={({ open }) => <span>{open ? 'open' : 'closed'}</span>}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Audio output: Speakers' });
    expect(trigger).toHaveTextContent('closed');
    expect(trigger).toHaveAttribute('data-tip', 'Audio output');
    await user.click(trigger);
    expect(trigger).toHaveTextContent('open');
    expect(screen.getByRole('option', { name: /System default\s*Follows your system/ })).toBeInTheDocument();
  });
});
