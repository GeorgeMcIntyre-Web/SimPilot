import { useState, useCallback, useMemo } from 'react';
import type { AssetWithMetadata } from '../../../features/assets';
import { getMetadataValue } from '../../../utils/metadata';

export type SortKey =
  | 'robotNumber'
  | 'kind'
  | 'station'
  | 'robotType'
  | 'code'
  | 'installStatus'
  | 'comment'
  | 'area'
  | 'sourcing';

export type SortDirection = 'asc' | 'desc';

function normalize(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase().trim();
}

function getSortValue(asset: AssetWithMetadata, key: SortKey): string {
  if (key === 'robotNumber') {
    return (
      normalize(getMetadataValue(asset, 'robotNumber')) ||
      normalize(getMetadataValue(asset, 'Robo No. New')) ||
      normalize(getMetadataValue(asset, 'ROBO NO. NEW')) ||
      normalize((asset as any).robotNumber) ||
      normalize(getMetadataValue(asset, 'gunId'))
    );
  }

  if (key === 'kind') {
    return normalize(asset.kind);
  }

  if (key === 'station') {
    return (
      normalize(asset.stationNumber) ||
      normalize(getMetadataValue(asset, 'stationCode')) ||
      normalize(getMetadataValue(asset, 'station'))
    );
  }

  if (key === 'robotType') {
    return (
      normalize(getMetadataValue(asset, 'robotType')) ||
      normalize(getMetadataValue(asset, 'Robot Type')) ||
      normalize((asset as any).robotType)
    );
  }

  if (key === 'code') {
    return (
      normalize(getMetadataValue(asset, 'applicationCode')) ||
      normalize(getMetadataValue(asset, 'Code')) ||
      normalize((asset as any).applicationCode) ||
      normalize(getMetadataValue(asset, 'function')) ||
      normalize(getMetadataValue(asset, 'Function')) ||
      normalize(getMetadataValue(asset, 'application')) ||
      normalize(getMetadataValue(asset, 'robotApplication')) ||
      normalize(getMetadataValue(asset, 'Robot Application')) ||
      normalize((asset as any).function) ||
      normalize((asset as any).application)
    );
  }

  if (key === 'installStatus') {
    return (
      normalize(getMetadataValue(asset, 'installStatus')) ||
      normalize(getMetadataValue(asset, 'Install Status')) ||
      normalize(getMetadataValue(asset, 'Install status')) ||
      normalize(getMetadataValue(asset, 'install status')) ||
      normalize((asset as any).installStatus)
    );
  }

  if (key === 'comment') {
    return (
      normalize(getMetadataValue(asset, 'comment')) ||
      normalize(getMetadataValue(asset, 'Comment')) ||
      normalize(getMetadataValue(asset, 'esowComment')) ||
      normalize(getMetadataValue(asset, 'ESOW Comment')) ||
      normalize((asset as any).comment)
    );
  }

  if (key === 'area') {
    return normalize(asset.areaName) || normalize(getMetadataValue(asset, 'areaName'));
  }

  if (key === 'sourcing') {
    return normalize(asset.sourcing);
  }

  return '';
}

export function useAssetsSorting(assets: AssetWithMetadata[]) {
  const [sortKey, setSortKey] = useState<SortKey>('robotNumber');
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
      const valA = getSortValue(a, sortKey);
      const valB = getSortValue(b, sortKey);

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
