import { ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { coreStore } from '../../../domain/coreStore';
import { normalizeStationId } from '../../../domain/crossRef/CrossRefUtils';
import { normalizeStationCode, normalizeAreaName } from '../../../ingestion/normalizers';
import type { Column } from '../../../ui/components/DataTable';
import type { AssetWithMetadata } from '../../../features/assets';
import { AssetKindBadge } from '../../../features/assets/AssetBadges';
import type { SortKey } from '../../hooks/assets/useAssetsSorting';
import type { DetailedAssetKind } from '../../../ingestion/excelIngestionTypes';
import { getMetadataValue } from '../../../utils/metadata';

function extractMetadata<T>(asset: AssetWithMetadata, key: string): T | undefined {
  return getMetadataValue<T>(asset, key);
}

type SortHeaderProps = {
  label: string;
  keyName: SortKey;
  onSort: (key: SortKey) => void;
};

function SortHeader({ label, keyName, onSort }: SortHeaderProps) {
  return (
    <button
      onClick={() => onSort(keyName)}
      className="flex items-center space-x-1 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors"
    >
      <span>{label}</span>
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );
}

export function createAssetsTableColumns(
  onSort: (key: SortKey) => void
): Column<AssetWithMetadata>[] {
  return [
    {
      header: <SortHeader label="Robot #" keyName="robotNumber" onSort={onSort} />,
      accessor: (asset) => {
        const robotNumber =
          extractMetadata<string>(asset, 'robotNumber') ||
          extractMetadata<string>(asset, 'Robo No. New') ||
          extractMetadata<string>(asset, 'ROBO NO. NEW') ||
          (asset as any).robotNumber;
        const gunId = extractMetadata<string>(asset, 'gunId');
        if (robotNumber !== undefined) {
          return (
            <Link
              to={`/assets/${encodeURIComponent(asset.id)}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
              onClick={(e) => e.stopPropagation()}
              title={`View ${robotNumber}`}
            >
              {robotNumber}
            </Link>
          );
        }
        if (gunId !== undefined) {
          return <span className="text-gray-500 dark:text-gray-400">{gunId}</span>;
        }
        return '—';
      },
    },
    {
      header: <SortHeader label="Kind" keyName="kind" onSort={onSort} />,
      accessor: (asset) => {
        const detailedKind = extractMetadata<DetailedAssetKind>(asset, 'detailedKind');
        return <AssetKindBadge kind={asset.kind} detailedKind={detailedKind} />;
      },
    },
    {
      header: <SortHeader label="Station" keyName="station" onSort={onSort} />,
      accessor: (asset) => {
        const station =
          asset.stationNumber ||
          (asset.metadata?.stationCode as string) ||
          '';
        const area =
          asset.areaName ||
          extractMetadata<string>(asset, 'areaName') ||
          extractMetadata<string>(asset, 'areaGroup') ||
          (asset as any).areaName ||
          '';

        if (!station) return '—';

        // Preferred: Match by canonical stationId if available
        let cell = asset.stationId
          ? coreStore.getState().cells.find(c => c.stationId === asset.stationId)
          : undefined;

        // Fallback: Match by station number AND area name
        if (!cell) {
          const normalizedStation = normalizeStationCode(station) || normalizeStationId(station);
          const normAssetAreaName = normalizeAreaName(area);

          cell = coreStore.getState().cells.find(c => {
            const normalizedCellCode = normalizeStationCode(c.code) || normalizeStationId(c.code);
            
            // Try matching by station plus a check on the area if both are available
            const stationMatches = normalizedCellCode === normalizedStation;
            if (!stationMatches) return false;
            
            // If we have an area name for the asset, it MUST match the cell's area name
            if (normAssetAreaName) {
              const cellArea = coreStore.getState().areas.find(a => a.id === c.areaId);
              const normCellAreaName = normalizeAreaName(cellArea?.name || '');
              return normAssetAreaName === normCellAreaName;
            }

            // If asset has NO area but cell DOES, reflect caution (don't auto-match)
            const cellArea = coreStore.getState().areas.find(a => a.id === c.areaId);
            if (cellArea?.name) return false;

            return true;
          });
        }

        if (!cell) return station;
        return (
          <Link
            to={`/cells/${encodeURIComponent(cell.id)}`}
            className="text-blue-600 dark:text-blue-400 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {(cell as any).displayCode || station}
          </Link>
        );
      },
    },
    {
      header: <SortHeader label="Area" keyName="area" onSort={onSort} />,
      accessor: (asset) => {
        const area =
          asset.areaName ||
          extractMetadata<string>(asset, 'areaGroup') ||
          extractMetadata<string>(asset, 'areaFull') ||
          extractMetadata<string>(asset, 'area') ||
          extractMetadata<string>(asset, 'Area') ||
          (asset as any).areaName ||
          null;
        return area || '—';
      },
    },
    {
      header: <SortHeader label="Robot Type" keyName="robotType" onSort={onSort} />,
      accessor: (asset) => {
        const type =
          extractMetadata<string>(asset, 'robotType') ||
          extractMetadata<string>(asset, 'Robot Type') ||
          (asset as any).robotType ||
          null;
        return type || '—';
      },
    },
    {
      header: <SortHeader label="Code" keyName="code" onSort={onSort} />,
      accessor: (asset) => {
        const code =
          extractMetadata<string>(asset, 'applicationCode') ||
          extractMetadata<string>(asset, 'Code') ||
          (asset as any).applicationCode ||
          // Fallback to legacy function/application fields if code is missing
          extractMetadata<string>(asset, 'function') ||
          extractMetadata<string>(asset, 'Function') ||
          extractMetadata<string>(asset, 'application') ||
          extractMetadata<string>(asset, 'robotApplication') ||
          extractMetadata<string>(asset, 'Robot Application') ||
          (asset as any).function ||
          (asset as any).application ||
          null;
        return code || '—';
      },
    },
    {
      header: <SortHeader label="Install Status" keyName="installStatus" onSort={onSort} />,
      accessor: (asset) => {
        const status =
          extractMetadata<string>(asset, 'installStatus') ||
          extractMetadata<string>(asset, 'Install Status') ||
          extractMetadata<string>(asset, 'Install status') ||
          extractMetadata<string>(asset, 'install status') ||
          (asset as any).installStatus ||
          null;
        return status && status.toString().trim().length > 0 ? status : '-';
      },
    },
    {
      header: <SortHeader label="Comment" keyName="comment" onSort={onSort} />,
      accessor: (asset) => {
        const comment =
          extractMetadata<string>(asset, 'comment') ||
          extractMetadata<string>(asset, 'Comment') ||
          extractMetadata<string>(asset, 'esowComment') ||
          extractMetadata<string>(asset, 'ESOW Comment') ||
          (asset as any).comment ||
          null;
        return comment && comment.toString().trim().length > 0 ? comment : '—';
      },
    },
    // Sourcing, Reuse Status, and Asset columns intentionally removed per request
  ];
}
