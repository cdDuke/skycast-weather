import { useEffect, useId, useRef, useState } from 'react';
import { searchPlaces, type Place } from '../api';
import { useI18n } from '../i18n';

export default function Search({ onPick }: { onPick: (p: Place) => void }) {
  const { t, lang } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);

  // debounced geocoding with cancellation of stale requests
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      searchPlaces(q, lang, ctrl.signal)
        .then((r) => {
          setResults(r);
          setActive(r.length ? 0 : -1);
          setOpen(true);
        })
        .catch((e: unknown) => {
          if ((e as Error).name !== 'AbortError') setResults([]);
        })
        .finally(() => !ctrl.signal.aborted && setLoading(false));
    }, 280);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, lang]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  const pick = (p: Place) => {
    onPick(p);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && query.trim().length >= 2;

  return (
    <div className="search" ref={boxRef}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={query}
        placeholder={t('search')}
        aria-label={t('searchAria')}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onKeyDown={onKey}
      />
      {loading && <span className="search__spin" aria-hidden="true" />}
      {showList && (
        <ul className="search__list" id={listId} role="listbox">
          {results.length === 0 && !loading && <li className="search__empty">{t('noCities')}</li>}
          {results.map((p, i) => (
            <li
              key={p.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-active' : ''}
              onPointerEnter={() => setActive(i)}
              onClick={() => pick(p)}
            >
              <strong>{p.name}</strong>
              <span>{[p.admin, p.country].filter(Boolean).join(', ')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
