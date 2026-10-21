import { useState, useEffect, useRef, useCallback } from 'react';

export function useDebounceSearch(delay = 300) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(query), delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, delay]);

  const search = useCallback((value: string) => setQuery(value), []);

  return { query, debouncedQuery, search };
}
