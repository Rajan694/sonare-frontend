import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Field } from '../ui/Field';
import Icon from '../ui/Icon';
import { useAppDispatch, useAppSelector } from '../../store';
import { setQuery } from '../../store/searchSlice';
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
  const onSearchPage = location.pathname === '/search';

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    dispatch(setQuery(v));
    if (v.trim() && !onSearchPage) navigate('/search');
  };

  const handleSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !onSearchPage) navigate('/search');
    else if (e.key === 'Escape') e.currentTarget.blur();
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
    <Field
      ref={searchRef}
      square
      icon="search"
      shortcut={query ? undefined : shortcut}
      value={query}
      onChange={handleSearchChange}
      onKeyDown={handleSearchKey}
      placeholder="Search songs, albums, artists"
      className={cn('w-full h-[38px]', className)}
      aria-label="Search"
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
  );
};
export default SearchField;
