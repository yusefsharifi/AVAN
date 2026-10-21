import { useState, useCallback, useRef, useEffect } from 'react';
import { useCorrespondenceStore } from '../store';
import type { SearchFilters } from '../types';

export function useLetterSearch() {
  const { setFilters, clearFilters, filters, filteredLetters, savedFilters, saveFilter, deleteFilter } = useCorrespondenceStore();
  const [debouncedQuery, setDebouncedQuery] = useState(filters.query);
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Debounced search (300ms)
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setFilters({ query: debouncedQuery });
    }, 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [debouncedQuery, setFilters]);

  const search = useCallback((query: string) => {
    setDebouncedQuery(query);
  }, []);

  const applyFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters(newFilters);
  }, [setFilters]);

  const results = filteredLetters();

  return {
    query: debouncedQuery,
    search,
    filters,
    applyFilters,
    clearFilters,
    results,
    resultCount: results.length,
    savedFilters,
    saveFilter,
    deleteFilter,
  };
}
