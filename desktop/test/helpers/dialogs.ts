import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

/**
 * Drives the app's own dialogs (src/store/dialogs.ts, rendered by DialogHost) and
 * dropdowns (src/components/ui/Select.tsx), which replaced window.prompt / confirm and
 * native <select>s.
 */

/** Waits out the closing animation, so the next dialog is the only one on screen. */
export const dialogGone = async (): Promise<void> => {
  await waitFor(() => {
    if (screen.queryByRole('dialog') || screen.queryByRole('alertdialog')) throw new Error('A dialog is still open');
  });
};

/** Types `text` into the open name dialog and submits it; '' cancels instead. */
export const answerPrompt = async (user: UserEvent, text: string): Promise<void> => {
  const dialog = await screen.findByRole('dialog');
  if (!text.trim()) {
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await dialogGone();
    return;
  }
  const field = within(dialog).getByRole('textbox');
  await user.clear(field);
  await user.type(field, text);
  await user.keyboard('{Enter}');
  await dialogGone();
};

/** Answers the open confirm dialog: `true` presses its confirm button, `false` Cancel. */
export const answerConfirm = async (user: UserEvent, ok: boolean): Promise<string> => {
  const dialog = await screen.findByRole('alertdialog');
  const title = within(dialog).getByRole('heading').textContent ?? '';
  const buttons = within(dialog).getAllByRole('button');
  await user.click(ok ? buttons[buttons.length - 1] : within(dialog).getByRole('button', { name: 'Cancel' }));
  await dialogGone();
  return title;
};

/** Waits until no dropdown list is on screen (closing ones animate out). */
export const listGone = async (): Promise<void> => {
  await waitFor(() => {
    if (screen.queryByRole('listbox')) throw new Error('A dropdown list is still open');
  });
};

/** The options of the open dropdown list (it is portalled to the page body). */
export const openOptions = (): string[] => {
  return screen.getAllByRole('option').map((o) => o.textContent ?? '');
};

/**
 * Opens the dropdown labelled `label` and picks the option named `option`. `scope` limits
 * where the trigger is looked for (e.g. one of two layouts on screen at once).
 */
export const chooseOption = async (
  user: UserEvent,
  label: string | RegExp,
  option: string | RegExp,
  scope: Pick<typeof screen, 'getByRole'> = screen,
): Promise<void> => {
  await user.click(scope.getByRole('button', { name: label }));
  await user.click(await screen.findByRole('option', { name: option }));
  await listGone();
};
