import { ArrowUpDown } from 'lucide-react';
import type { Column } from '../../../ui/components/DataTable';
import type { AssetWithMetadata } from '../../../features/assets';
import type { ReuseAllocationStatus, DetailedAssetKind } from '../../../ingestion/excelIngestionTypes';
import { AssetKindBadge, SourcingBadge, ReuseStatusBadge, BottleneckBadge } from '../../../features/assets/AssetBadges';
import type { SortKey } from '../../hooks/assets/useAssetsSorting';
import type { BottleneckSeverity, BottleneckReason, WorkflowStage } from '../../../domain/toolingBottleneckStore';

function extractMetadata<T>(asset: AssetWithMetadata, key: string): T | undefined {
  const value = asset.metadata?.[key];
  if (value === null || value === undefined) {
    return undefined;
  }
  return value as T;
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
      header: <SortHeader label="Asset" keyName="name" onSort={onSort} />,
      accessor: (asset) => (
        <span className="font-medium text-gray-900 dark:text-white">{asset.name || '—'}</span>
      ),
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
      accessor: (asset) => asset.stationNumber ?? '—',
    },
    {
      header: 'Serial #',
      accessor: (asset) => {
        const serial =
          extractMetadata<string>(asset, 'serialNumber') ||
          extractMetadata<string>(asset, 'eNumber') ||
          null;
        return serial || '—';
      },
    },
    {
      header: 'Function',
      accessor: (asset) => {
        const fn =
          extractMetadata<string>(asset, 'function') ||
          extractMetadata<string>(asset, 'application') ||
          extractMetadata<string>(asset, 'applicationCode') ||
          null;
        return fn || '—';
      },
    },
    {
      header: <SortHeader label="Sourcing" keyName="sourcing" onSort={onSort} />,
      accessor: (asset) => {
        const bottleneck = assetBottleneckMap.get(asset.id);
        return (
          <div className="flex flex-col gap-1">
            <SourcingBadge sourcing={asset.sourcing} />
            {bottleneck && (
              <BottleneckBadge
                stage={bottleneck.stage}
                reason={bottleneck.reason}
                severity={bottleneck.severity}
              />
            )}
          </div>
        );
      },
    },
    {
      header: 'Reuse Status',
      accessor: (asset) => {
        if (asset.sourcing !== 'REUSE') {
          return <span className="text-gray-400 text-xs">—</span>;
        }
        const reuseStatus = extractMetadata<ReuseAllocationStatus>(asset, 'reuseAllocationStatus');
        if (reuseStatus === undefined) {
          return <ReuseStatusBadge status="UNKNOWN" />;
        }
        return <ReuseStatusBadge status={reuseStatus} />;
      },
    },
    {
      header: 'Robot #',
      accessor: (asset) => {
        const robotNumber = extractMetadata<string>(asset, 'robotNumber');
        const gunId = extractMetadata<string>(asset, 'gunId');
        if (robotNumber !== undefined) {
          return <span className="font-mono text-sm">{robotNumber}</span>;
        }
        if (gunId !== undefined) {
          return <span className="font-mono text-sm text-gray-500">{gunId}</span>;
        }
        return '—';
      },
    },
  ];
}
