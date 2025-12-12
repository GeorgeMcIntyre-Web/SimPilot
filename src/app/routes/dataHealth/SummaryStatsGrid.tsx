import { Package, AlertTriangle, HelpCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { DataHealthMetrics } from '../../../domain/dataHealthStore';
import type { ReuseSummary } from '../../../domain/dataHealthStore';

interface SummaryStatsGridProps {
  metrics: DataHealthMetrics;
  reuseSummary: ReuseSummary;
}

export function SummaryStatsGrid({ metrics, reuseSummary }: SummaryStatsGridProps) {
  const cards = [
    {
      title: 'Total Assets',
      value: metrics.totalAssets,
      icon: <Package className="h-5 w-5 text-sky-600 dark:text-sky-400" />,
      accent: 'text-sky-700 dark:text-sky-300',
      subtitle: 'Across all ingested files'
    },
    {
      title: 'Ingestion Errors',
      value: metrics.totalErrors,
      icon:
        metrics.totalErrors > 0 ? (
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        ),
      accent: metrics.totalErrors > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300',
      subtitle: metrics.totalErrors > 0 ? 'Needs review' : 'All clear'
    },
    {
      title: 'UNKNOWN Sourcing',
      value: metrics.unknownSourcingCount,
      icon: <HelpCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
      accent: 'text-purple-700 dark:text-purple-300',
      subtitle:
        metrics.totalAssets > 0
          ? `${((metrics.unknownSourcingCount / metrics.totalAssets) * 100).toFixed(1)}% of assets`
          : undefined
    },
    {
      title: 'Reuse Pool',
      value: reuseSummary.total,
      icon: <RefreshCw className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
      accent: 'text-emerald-700 dark:text-emerald-300',
      subtitle: reuseSummary.unmatchedReuseCount > 0 ? `${reuseSummary.unmatchedReuseCount} unmatched` : 'All matched'
    }
  ];

  const renderCard = (card: (typeof cards)[number]) => (
    <div
      key={card.title}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 h-full shadow-sm flex items-center justify-between gap-2.5"
    >
      <div className="space-y-0.5 leading-tight">
        <div className={`text-xl font-bold ${card.accent}`}>{card.value}</div>
        <div className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">{card.title}</div>
        {card.subtitle && (
          <div className="text-[10px] text-gray-500 dark:text-gray-400">{card.subtitle}</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700">
          {card.icon}
        </div>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {cards.map(renderCard)}
    </div>
  );
}
