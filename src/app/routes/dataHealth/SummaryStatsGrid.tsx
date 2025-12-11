import { Package, AlertTriangle, HelpCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { StatCard } from '../../../ui/components/StatCard';
import type { DataHealthMetrics } from '../../../domain/dataHealthStore';
import type { ReuseSummary } from '../../../domain/dataHealthStore';

interface SummaryStatsGridProps {
  metrics: DataHealthMetrics;
  reuseSummary: ReuseSummary;
}

export function SummaryStatsGrid({ metrics, reuseSummary }: SummaryStatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Assets"
        value={metrics.totalAssets}
        icon={<Package className="h-6 w-6" />}
        variant="default"
      />
      <StatCard
        title="Ingestion Errors"
        value={metrics.totalErrors}
        icon={
          metrics.totalErrors > 0 ? (
            <AlertTriangle className="h-6 w-6" />
          ) : (
            <CheckCircle2 className="h-6 w-6" />
          )
        }
        variant={metrics.totalErrors > 0 ? 'warning' : 'success'}
      />
      <StatCard
        title="UNKNOWN Sourcing"
        value={metrics.unknownSourcingCount}
        subtitle={
          metrics.totalAssets > 0
            ? `${((metrics.unknownSourcingCount / metrics.totalAssets) * 100).toFixed(1)}% of assets`
            : undefined
        }
        icon={<HelpCircle className="h-6 w-6" />}
        variant={metrics.unknownSourcingCount > 0 ? 'warning' : 'success'}
      />
      <StatCard
        title="Reuse Pool"
        value={reuseSummary.total}
        subtitle={
          reuseSummary.unmatchedReuseCount > 0
            ? `${reuseSummary.unmatchedReuseCount} unmatched`
            : 'All matched'
        }
        icon={<RefreshCw className="h-6 w-6" />}
        variant="default"
      />
    </div>
  );
}
