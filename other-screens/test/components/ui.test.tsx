import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import Button, { IconButton } from '../../src/components/ui/Button';
import { Slider } from '../../src/components/ui/Slider';
import { Switch } from '../../src/components/ui/Switch';
import { Segmented } from '../../src/components/ui/Segmented';
import { Menu, MenuItem } from '../../src/components/ui/Menu';
import { Field } from '../../src/components/ui/Field';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Toast } from '../../src/components/ui/Toast';
import TooltipLayer from '../../src/components/ui/Tooltip';

afterEach(() => vi.useRealTimers());

describe('buttons', () => {
  it('WEB-UI-001 a button runs its handler, and not when disabled', async () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button icon="play" onClick={onClick}>
        Play all
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Play all' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(
      <Button onClick={onClick} disabled>
        Play all
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Play all' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('WEB-UI-002 an icon button is named by its label, with a shorter tooltip and shortcut when given', () => {
    render(
      <>
        <IconButton icon="heart" label="Save Karma Police to favourites" tip="Save" />
        <IconButton icon="play" label="Play" kbd="Space" active />
      </>,
    );
    const save = screen.getByRole('button', { name: 'Save Karma Police to favourites' });
    expect(save).toHaveAttribute('data-tip', 'Save');
    const play = screen.getByRole('button', { name: 'Play' });
    expect(play).toHaveAttribute('data-tip', 'Play');
    expect(play).toHaveAttribute('data-tip-kbd', 'Space');
    expect(play).toHaveClass('ib-on');
  });
});

/** A slider wired to state, as screens use it. */
function LiveSlider(
  props: Partial<React.ComponentProps<typeof Slider>> & { initial?: number; onCommit?: (v: number) => void },
) {
  const [v, setV] = useState(props.initial ?? 50);
  return <Slider ariaLabel="Volume" {...props} value={v} onChange={setV} />;
}

describe('slider', () => {
  it('WEB-UI-003 exposes its range and value to assistive tech', () => {
    render(<Slider ariaLabel="Bass" value={3.456} min={-12} max={12} onChange={() => {}} />);
    const s = screen.getByRole('slider', { name: 'Bass' });
    expect(s).toHaveAttribute('aria-valuemin', '-12');
    expect(s).toHaveAttribute('aria-valuemax', '12');
    expect(s).toHaveAttribute('aria-valuenow', '3.46');
    expect(s).toHaveAttribute('tabindex', '0');
  });

  it('WEB-UI-004 arrow, page, home and end keys move by step and commit each change', async () => {
    const onCommit = vi.fn();
    render(<LiveSlider initial={50} step={5} onCommit={onCommit} />);
    const s = screen.getByRole('slider');
    s.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(s).toHaveAttribute('aria-valuenow', '55');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(s).toHaveAttribute('aria-valuenow', '45');
    await userEvent.keyboard('{PageUp}');
    expect(s).toHaveAttribute('aria-valuenow', '55');
    await userEvent.keyboard('{End}');
    expect(s).toHaveAttribute('aria-valuenow', '100');
    await userEvent.keyboard('{ArrowUp}');
    expect(s).toHaveAttribute('aria-valuenow', '100');
    await userEvent.keyboard('{Home}');
    expect(s).toHaveAttribute('aria-valuenow', '0');
    expect(onCommit.mock.calls.map((c) => c[0])).toEqual([55, 50, 45, 55, 100, 100, 0]);
  });

  it('WEB-UI-005 dragging follows the pointer live and commits once on release', () => {
    const onCommit = vi.fn();
    const onChange = vi.fn();
    render(<Slider ariaLabel="Seek" value={0} onChange={onChange} onCommit={onCommit} />);
    const s = screen.getByRole('slider');
    const rail = s.firstElementChild as HTMLElement;
    rail.getBoundingClientRect = () => ({
      left: 100,
      width: 200,
      top: 0,
      height: 4,
      right: 300,
      bottom: 4,
      x: 100,
      y: 0,
      toJSON: () => ({}),
    });
    s.setPointerCapture = vi.fn();
    fireEvent.pointerDown(s, { button: 0, clientX: 150, pointerId: 1 });
    fireEvent.pointerMove(s, { clientX: 250, pointerId: 1 });
    fireEvent.pointerMove(s, { clientX: 999, pointerId: 1 });
    fireEvent.pointerUp(s, { clientX: 999, pointerId: 1 });
    expect(onChange.mock.calls.map((c) => c[0])).toEqual([25, 75, 100]);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(100);
    // Moving without a press does nothing.
    fireEvent.pointerMove(s, { clientX: 120, pointerId: 1 });
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('WEB-UI-006 a vertical fader reads bottom as minimum', () => {
    const onChange = vi.fn();
    render(<Slider ariaLabel="60 Hz" vertical value={0} min={-12} max={12} step={0.5} onChange={onChange} />);
    const s = screen.getByRole('slider');
    expect(s).toHaveAttribute('aria-orientation', 'vertical');
    const rail = s.firstElementChild as HTMLElement;
    rail.getBoundingClientRect = () => ({
      left: 0,
      width: 4,
      top: 0,
      height: 100,
      right: 4,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    s.setPointerCapture = vi.fn();
    fireEvent.pointerDown(s, { button: 0, clientY: 25, pointerId: 1 });
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it('WEB-UI-007 double-click resets to the default value', async () => {
    const onCommit = vi.fn();
    render(<LiveSlider initial={80} resetValue={50} onCommit={onCommit} />);
    await userEvent.dblClick(screen.getByRole('slider'));
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '50');
    expect(onCommit).toHaveBeenCalledWith(50);
  });

  it('WEB-UI-008 a disabled or read-only slider ignores input and is not focusable', async () => {
    const onChange = vi.fn();
    render(<Slider ariaLabel="Locked" value={30} onChange={onChange} disabled resetValue={0} />);
    const s = screen.getByRole('slider');
    expect(s).toHaveAttribute('tabindex', '-1');
    expect(s).toHaveAttribute('aria-disabled', 'true');
    fireEvent.keyDown(s, { key: 'ArrowRight' });
    await userEvent.dblClick(s);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('toggles and choices', () => {
  it('WEB-UI-009 a switch reports its state and asks for the opposite on click', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Gapless playback" checked={false} onCheckedChange={onCheckedChange} />);
    const sw = screen.getByRole('switch', { name: 'Gapless playback' });
    expect(sw).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(sw);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('WEB-UI-010 a segmented control marks the chosen option and reports clicks', async () => {
    const onChange = vi.fn();
    render(
      <Segmented
        value="songs"
        onChange={onChange}
        options={[
          { id: 'songs', label: 'Songs' },
          { id: 'albums', label: 'Albums', icon: 'disc' },
        ]}
      />,
    );
    expect(screen.getByRole('button', { name: 'Songs' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Albums' })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Albums' }));
    expect(onChange).toHaveBeenCalledWith('albums');
  });

  it('WEB-UI-011 menu items run their action; disabled ones do not', async () => {
    const add = vi.fn();
    const del = vi.fn();
    render(
      <Menu>
        <MenuItem icon="plus" shortcut="Q" onClick={add}>
          Add to queue
        </MenuItem>
        <MenuItem danger disabled onClick={del}>
          Delete
        </MenuItem>
      </Menu>,
    );
    await userEvent.click(screen.getByRole('button', { name: /Add to queue/ }));
    await userEvent.click(screen.getByRole('button', { name: /Delete/ }));
    expect(add).toHaveBeenCalledTimes(1);
    expect(del).not.toHaveBeenCalled();
    expect(screen.getByText('Q')).toHaveClass('kbd');
  });

  it('WEB-UI-012 a field is a labelled text input that passes typing through', async () => {
    const onChange = vi.fn();
    render(<Field icon="search" placeholder="Search songs" shortcut="/" onChange={onChange} />);
    const input = screen.getByPlaceholderText('Search songs');
    expect(input).toHaveAttribute('type', 'text');
    await userEvent.type(input, 'abc');
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(input).toHaveValue('abc');
  });
});

describe('messages', () => {
  it('WEB-UI-013 an empty state shows its title, description and action', () => {
    render(
      <EmptyState
        icon="music"
        title="No songs yet"
        description="Search to find something"
        action={<button>Search</button>}
      />,
    );
    expect(screen.getByText('No songs yet')).toBeInTheDocument();
    expect(screen.getByText('Search to find something')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
  });

  it('WEB-UI-014 a toast shows only while visible and can be dismissed', async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Toast show title="Added to queue" description="Reckoner" icon="list" onClose={onClose} />,
    );
    expect(screen.getByText('Added to queue')).toBeInTheDocument();
    expect(screen.getByText('Reckoner')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Close message' }));
    expect(onClose).toHaveBeenCalled();
    rerender(<Toast show={false} title="Added to queue" />);
    await vi.waitFor(() => expect(screen.queryByText('Added to queue')).not.toBeInTheDocument());
  });
});

describe('tooltips', () => {
  function over(el: Element, pointerType = 'mouse') {
    const e = new MouseEvent('pointerover', { bubbles: true });
    Object.defineProperty(e, 'pointerType', { value: pointerType });
    el.dispatchEvent(e);
  }
  function out(el: Element) {
    el.dispatchEvent(new MouseEvent('pointerout', { bubbles: true }));
  }
  const tipText = () => document.querySelector('.fixed.z-\\[70\\]')?.textContent ?? null;

  function Harness() {
    const navigate = useNavigate();
    return (
      <>
        <TooltipLayer />
        <button data-tip="Play" data-tip-kbd="Space">
          p
        </button>
        <button data-tip="Next">n</button>
        <button onClick={() => navigate('/other')}>go</button>
      </>
    );
  }
  const setup = () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>,
    );
    return { play: screen.getByText('p'), next: screen.getByText('n') };
  };

  it('WEB-UI-015 appears after a short hover delay with its shortcut, and goes on leaving', () => {
    const { play } = setup();
    act(() => over(play));
    act(() => vi.advanceTimersByTime(400));
    expect(tipText()).toBeNull();
    act(() => vi.advanceTimersByTime(60));
    expect(tipText()).toBe('PlaySpace');
    act(() => out(play));
    expect(tipText()).toBeNull();
  });

  it('WEB-UI-016 moving straight to the next control shows its tooltip at once', () => {
    const { play, next } = setup();
    act(() => over(play));
    act(() => vi.advanceTimersByTime(500));
    act(() => over(next));
    expect(tipText()).toBe('Next');
  });

  it('WEB-UI-017 follows a label change live (Play turns into Pause)', async () => {
    const { play } = setup();
    act(() => over(play));
    act(() => vi.advanceTimersByTime(500));
    await act(async () => play.setAttribute('data-tip', 'Pause'));
    expect(tipText()).toBe('PauseSpace');
  });

  it('WEB-UI-018 touch never shows it; Escape and pressing the control hide it', () => {
    const { play } = setup();
    act(() => over(play, 'touch'));
    act(() => vi.advanceTimersByTime(1000));
    expect(tipText()).toBeNull();
    act(() => over(play));
    act(() => vi.advanceTimersByTime(500));
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(tipText()).toBeNull();
    act(() => out(play));
    act(() => over(play));
    act(() => vi.advanceTimersByTime(500));
    expect(tipText()).toBe('PlaySpace');
    act(() => {
      play.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    });
    expect(tipText()).toBeNull();
    // Still over the pressed control: it stays quiet.
    act(() => over(play));
    act(() => vi.advanceTimersByTime(1000));
    expect(tipText()).toBeNull();
  });

  it('WEB-UI-019 changing screen hides it', () => {
    const { play } = setup();
    act(() => over(play));
    act(() => vi.advanceTimersByTime(500));
    expect(tipText()).not.toBeNull();
    act(() => {
      fireEvent.click(screen.getByText('go'));
    });
    expect(tipText()).toBeNull();
  });
});
