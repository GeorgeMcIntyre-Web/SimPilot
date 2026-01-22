import { ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { coreStore } from '../../../domain/coreStore';
import { normalizeStationId } from '../../../domain/crossRef/CrossRefUtils';
import { normalizeStationCode } from '../../../ingestion/normalizers';
import type { Column } from '../../../ui/components/DataTable';
import type { AssetWithMetadata } from '../../../features/assets';
import type { ReuseAllocationStatus, DetailedAssetKind } from '../../../ingestion/excelIngestionTypes';
import { AssetKindBadge, SourcingBadge, ReuseStatusBadge, BottleneckBadge } from '../../../features/assets/AssetBadges';
import type { SortKey } from '../../hooks/assets/useAssetsSorting';
import type { BottleneckSeverity, BottleneckReason, WorkflowStage } from '../../../domain/toolingBottleneckStore';
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
  onSort: (key: SortKey) => void,
  assetBottleneckMap: Map<string, { stage: WorkflowStage; reason: BottleneckReason; severity: BottleneckSeverity }>
): Column<AssetWithMetadata>[] {
  return [
    {
      header: 'Robot #',
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
        if (!station) return '—';

        // Normalize using the same logic as ingestion to find a matching cell
        const normalizedStation = normalizeStationCode(station) || normalizeStationId(station);
        const cell = coreStore.getState().cells.find(c => {
          const normalizedCellCode = normalizeStationCode(c.code) || normalizeStationId(c.code);
          return normalizedCellCode === normalizedStation;
        });

        if (!cell) return station;
        return (
          <Link
            to={`/cells/${encodeURIComponent(cell.id)}`}
            className="text-blue-600 dark:text-blue-400 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {station}
          </Link>
        );
      },
    },
    {
      header: 'Robot Type',
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
      header: 'Function',
      accessor: (asset) => {
        const fn =
          extractMetadata<string>(asset, 'function') ||
          extractMetadata<string>(asset, 'Function') ||
          extractMetadata<string>(asset, 'application') ||
          extractMetadata<string>(asset, 'applicationCode') ||
          extractMetadata<string>(asset, 'robotApplication') ||
          extractMetadata<string>(asset, 'Robot Application') ||
          // Fallback to direct fields if present on the asset
          (asset as any).function ||
          (asset as any).application ||
          (asset as any).applicationCode ||
          null;
        return fn || '—';
      },
    },
    {
      header: 'Robot Application Concern',
      accessor: (asset) => {
        const concern =
          extractMetadata<string>(asset, 'applicationConcern') ||
          extractMetadata<string>(asset, 'Application Concern') ||
          extractMetadata<string>(asset, 'Robot application concern');
        return concern && concern.toString().trim().length > 0 ? concern : '—';
      },
    },
    {
      header: 'Install Status',
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
    // Sourcing, Reuse Status, and Asset columns intentionally removed per request
  ];
}
