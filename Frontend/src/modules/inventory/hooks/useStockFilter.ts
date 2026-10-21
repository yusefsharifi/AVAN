import { useState, useMemo } from 'react';
import { useInventoryStore } from '../store';
import { filterItems } from '../utils';

export function useStockFilter() {
  const { items } = useInventoryStore();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [abcClass, setAbcClass] = useState('');
  const [status, setStatus] = useState('');

  const filteredItems = useMemo(() =>
    filterItems(items, { search, category, abcClass, status }),
    [items, search, category, abcClass, status]
  );

  return { search, setSearch, category, setCategory, abcClass, setAbcClass, status, setStatus, filteredItems, totalCount: items.length };
}
