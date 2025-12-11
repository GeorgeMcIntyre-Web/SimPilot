import { useState, useCallback, useMemo } from 'react';
import type { AssetWithMetadata } from '../../../features/assets';

export type SortKey = 'name' | 'kind' | 'station' | 'area' | 'sourcing';
export type SortDirection = 'asc' | 'desc';

export function useAssetsSorting(assets: AssetWithMetadata[]) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        return prevKey;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const sortedAssets = useMemo(() => {
    return [...assets].sort((a, b) => {
      let valA: string = '';
      let valB: string = '';

      switch (sortKey) {
        case 'name':
          valA = a.name ?? '';
          valB = b.name ?? '';
          break;
        case 'kind':
          valA = a.kind ?? '';
          valB = b.kind ?? '';
          break;
        case 'station':
          valA = a.stationNumber ?? '';
          valB = b.stationNumber ?? '';
          break;
        case 'area':
          valA = a.areaName ?? '';
          valB = b.areaName ?? '';
          break;
        case 'sourcing':
          valA = a.sourcing ?? '';
          valB = b.sourcing ?? '';
          break;
      }

      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [assets, sortKey, sortDir]);

  return {
    sortKey,
    sortDir,
    handleSort,
    sortedAssets,
  };
}
