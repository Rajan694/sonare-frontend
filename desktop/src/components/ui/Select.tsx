import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/cn';
import { transition } from '../../lib/motion';
import Icon, { type IconName } from './Icon';

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
  icon?: IconName;
  /** Second line under the label. */
  detail?: string;
}

interface SelectProps<T extends string | number> {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Leading icon in the trigger, e.g. `sort` for a sort order. */
  icon?: IconName;
  size?: 'sm' | 'md';
  /** Which edge of the trigger the list lines up with. */
  align?: 'start' | 'end';
  className?: string;
  /** Replaces the chip: the trigger's content (it stays a button with these classes). */
  renderTrigger?: (state: { open: boolean; selected?: SelectOption<T> }) => React.ReactNode;
  /** Tooltip for a custom trigger. */
  tip?: string;
  /** Called as the list opens, e.g. to refresh what it shows. */
  onOpen?: () => void;
}

/**
 * The app's dropdown: a chip that opens a themed list (the native <select> popup can't be
 * styled and looks out of place on Linux). The list is portalled so rounded, clipped
 * cards don't cut it off. Arrow keys, Home / End, Enter and Escape work as in a listbox.
 */
export const Select = <T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  icon,
  size = 'md',
  align = 'start',
  className,
  renderTrigger,
  tip,
  onOpen,
}: SelectProps<T>) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<{ left?: number; right?: number; top: number; minWidth: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  const place = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const rowHeight = options.some((o) => o.detail) ? 48 : 36;
    const listHeight = Math.min(320, options.length * rowHeight + 12);
    // Opens upwards when there's no room below (the bottom player sits there).
    const below = r.bottom + 6 + listHeight <= window.innerHeight - 8;
    const top = below ? r.bottom + 6 : Math.max(8, r.top - 6 - listHeight);
    setPos(
      align === 'end'
        ? { right: window.innerWidth - r.right, top, minWidth: r.width }
        : { left: Math.min(r.left, window.innerWidth - 8 - Math.max(r.width, 180)), top, minWidth: r.width },
    );
  };

  const openList = () => {
    onOpen?.();
    place();
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    setOpen(true);
  };

  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  };

  const choose = (i: number) => {
    const option = options[i];
    if (!option) return;
    if (option.value !== value) onChange(option.value);
    close();
  };

  useLayoutEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!listRef.current?.contains(t) && !triggerRef.current?.contains(t)) close(false);
    };
    // The list is fixed-positioned: anything that moves the trigger closes it.
    const onMove = () => close(false);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('blur', onMove);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('blur', onMove);
    };
  }, [open]);

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      openList();
    }
  };

  const onListKey = (e: React.KeyboardEvent) => {
    // Keeps Space / arrows from reaching the player shortcuts while the list is open.
    e.stopPropagation();
    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      close(e.key === 'Escape');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(active);
    }
  };

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' });
  }, [active, open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onTriggerKey}
        data-tip={renderTrigger && !open ? tip : undefined}
        className={
          renderTrigger
            ? className
            : cn(
                'chip inline-flex items-center gap-1.5 flex-none text-t1 bg-s2 border-ln2 cursor-pointer',
                size === 'sm' && 'chip-sm',
                open && 'border-ln3 bg-s3',
                className,
              )
        }
      >
        {renderTrigger ? (
          renderTrigger({ open, selected })
        ) : (
          <>
            {icon && <Icon name={icon} size={size === 'sm' ? 12 : 14} className="text-t3 flex-none" />}
            <span className="truncate">{selected?.label ?? ''}</span>
            <Icon
              name="chevron-down"
              size={size === 'sm' ? 12 : 14}
              className={cn('text-t3 flex-none transition-transform duration-150', open && 'rotate-180')}
            />
          </>
        )}
      </button>
      {createPortal(
        <AnimatePresence>
          {open && pos && (
            <motion.div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={ariaLabel}
              aria-activedescendant={`${listId}-${active}`}
              tabIndex={-1}
              onKeyDown={onListKey}
              className="menu fixed z-[70] max-h-[320px] overflow-auto outline-none"
              style={{ left: pos.left, right: pos.right, top: pos.top, minWidth: Math.max(pos.minWidth, 180) }}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={transition.fast}
            >
              {options.map((o, i) => {
                const isSelected = o.value === value;
                return (
                  <div
                    key={String(o.value)}
                    id={`${listId}-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={isSelected}
                    onPointerEnter={() => setActive(i)}
                    onClick={() => choose(i)}
                    className="mi cursor-pointer"
                    // Inline: .mi is unlayered CSS and would beat Tailwind colour classes.
                    style={{
                      height: o.detail ? 'auto' : undefined,
                      background: i === active ? 'var(--s3)' : undefined,
                      color: isSelected ? 'var(--acc)' : i === active ? 'var(--t1)' : undefined,
                    }}
                  >
                    {o.icon && <Icon name={o.icon} size={16} className="flex-none" />}
                    {o.detail ? (
                      <span className="flex flex-col grow min-w-0 text-left py-1.5">
                        <span className="truncate">{o.label}</span>
                        <span className="text-label-s text-t3 truncate font-normal">{o.detail}</span>
                      </span>
                    ) : (
                      <span className="grow text-left truncate">{o.label}</span>
                    )}
                    {isSelected && <Icon name="check" size={14} className="flex-none" />}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
};
