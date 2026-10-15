import React, { useEffect, useId, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Field } from '../ui/Field';
import Icon from '../ui/Icon';
import { useAppDispatch, useAppSelector } from '../../store';
import { addRecent, setQuery } from '../../store/searchSlice';
import { useModeStore } from '../../store/modeContext';
import { useSearchSuggestions } from '../../api/hooks';
import { cn } from '../../lib/cn';

const isTyping = (el: EventTarget | null) => {
  return el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
};

interface SearchFieldProps {
  shortcut?: string;
  enableSlashShortcut?: boolean;
  enableCtrlKShortcut?: boolean;
  className?: string;
}

const SearchField = ({
  shortcut = '/',
  enableSlashShortcut = true,
  enableCtrlKShortcut = true,
  className,
}: SearchFieldProps) => {
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const query = useAppSelector((s) => s.search.query);
  const { mode } = useModeStore();
  const onSearchPage = location.pathname === '/search';

  // Suggestions open while typing and close once one is picked, Enter is pressed or focus leaves.
  const [suggesting, setSuggesting] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const suggestions = useSearchSuggestions(query, suggesting && mode === 'online');
  const open = suggesting && suggestions.length > 0;

  const suggestionsKey = suggestions.join('\n');
  useEffect(() => setActive(-1), [suggestionsKey]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    dispatch(setQuery(v));
    setSuggesting(true);
    if (v.trim() && !onSearchPage) navigate('/search');
  };

  const pick = (s: string) => {
    dispatch(setQuery(s));
    dispatch(addRecent(s));
    setSuggesting(false);
    if (!onSearchPage) navigate('/search');
  };

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      // -1 is the field itself: stepping past either end comes back to it.
      setActive((i) => {
        const next = i + step;
        return next >= suggestions.length ? -1 : next < -1 ? suggestions.length - 1 : next;
      });
    } else if (e.key === 'Enter') {
      if (open && active >= 0) pick(suggestions[active]);
      else {
        setSuggesting(false);
        if (query.trim()) dispatch(addRecent(query));
        if (!onSearchPage) navigate('/search');
      }
    } else if (e.key === 'Escape') {
      if (open) setSuggesting(false);
      else e.currentTarget.blur();
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (enableSlashShortcut && e.key === '/' && !isTyping(e.target) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (enableCtrlKShortcut && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enableSlashShortcut, enableCtrlKShortcut]);

  return (
    <div className="relative w-full">
      <Field
        ref={searchRef}
        square
        icon="search"
        shortcut={query ? undefined : shortcut}
        value={query}
        onChange={handleSearchChange}
        onKeyDown={handleSearchKey}
        onBlur={() => setSuggesting(false)}
        placeholder="Search songs, albums, artists"
        className={cn('w-full h-[38px]', className)}
        aria-label="Search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
      >
        {query && (
          <button
            className="ib ib-28 flex-none"
            aria-label="Clear search"
            data-tip="Clear search"
            onClick={() => {
              dispatch(setQuery(''));
              searchRef.current?.focus();
            }}
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </Field>
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          // Keep focus in the field, so the click lands before blur closes the list.
          onMouseDown={(e) => e.preventDefault()}
          className="menu absolute left-0 right-0 top-[calc(100%+6px)] z-[70] max-h-[360px] overflow-auto"
        >
          {suggestions.map((s, i) => (
            <div
              key={s}
              id={`${listId}-${i}`}
              role="option"
              aria-label={s}
              aria-selected={i === active}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(s)}
              className="mi cursor-pointer"
              // Inline: .mi is unlayered CSS and would beat Tailwind colour classes.
              style={{
                background: i === active ? 'var(--s3)' : undefined,
                color: i === active ? 'var(--t1)' : undefined,
              }}
            >
              <Icon name="search" size={14} className="flex-none text-t3" />
              <span className="grow text-left truncate">
                <SuggestionText text={s} typed={query.trim()} />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** The part already typed stays plain and the completion is bold, as search engines show it. */
const SuggestionText = ({ text, typed }: { text: string; typed: string }) => {
  if (!typed || !text.toLowerCase().startsWith(typed.toLowerCase())) return <>{text}</>;
  return (
    <>
      <span className="font-normal">{text.slice(0, typed.length)}</span>
      <span className="font-semibold">{text.slice(typed.length)}</span>
    </>
  );
};
export default SearchField;
