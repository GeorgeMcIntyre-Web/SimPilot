/**
 * DATA HEALTH PAGE
 *
 * Displays data ingestion health metrics including:
 * - Total assets in store
 * - Ingestion errors count and list
 * - Assets with UNKNOWN sourcing
 * - Reuse summary by type and status
 *
 * Part of Phase 4: Data Health Analytics
 */

import { Download, FileText } from 'lucide-react';
import { PageHeader } from '../../ui/components/PageHeader';
import { EmptyState } from '../../ui/components/EmptyState';
import { exportDataHealthJson, exportErrorsCsv } from '../../utils/dataHealthExport';
import { SummaryStatsGrid } from './dataHealth/SummaryStatsGrid';
import { ReuseSummarySection } from './dataHealth/ReuseSummarySection';
import { LinkingStatsSection } from './dataHealth/LinkingStatsSection';
import { ErrorsSection } from './dataHealth/ErrorsSection';
import { useDataHealth } from './dataHealth/useDataHealth';

export function DataHealthPage() {
  const { metrics, reuseSummary, groupedErrors, expandedSources, toggleSource, hasData, allErrors } =
    useDataHealth();

  const handleExportJson = () => {
    exportDataHealthJson({
      totalAssets: metrics.totalAssets,
      totalErrors: metrics.totalErrors,
      unknownSourcingCount: metrics.unknownSourcingCount,
      reuseSummary: metrics.reuseSummary,
      linkingStats: metrics.linkingStats,
      errors: allErrors,
    });
  };

  const handleExportErrorsCsv = () => {
    exportErrorsCsv(allErrors);
  };

  // Empty state
  if (hasData === false) {
    return (
      <div className="space-y-8">
        <PageHeader title="Data Health" subtitle="Monitor ingestion quality and asset statistics" />
        <EmptyState
          title="No Data Loaded"
          message="Load some data from the Data Loader to see health metrics."
          ctaLabel="Go to Data Loader"
          onCtaClick={() => (window.location.href = '/data-loader')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Export Actions */}
      <PageHeader
        title="Data Health"
        subtitle="Monitor ingestion quality and asset statistics"
        actions={
          <div className="flex gap-2">
            <button
              onClick={handleExportJson}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export JSON
            </button>
            {allErrors.length > 0 && (
              <button
                onClick={handleExportErrorsCsv}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                Export Errors CSV
              </button>
            )}
          </div>
        }
      />

      {/* Summary Stats */}
      <SummaryStatsGrid metrics={metrics} reuseSummary={reuseSummary} />

      {/* Reuse Summary Section */}
      <ReuseSummarySection reuseSummary={reuseSummary} />

      {/* Linking Stats (if available) */}
      {metrics.linkingStats !== null && <LinkingStatsSection linkingStats={metrics.linkingStats} />}

      {/* Errors Section */}
      <ErrorsSection
        groupedErrors={groupedErrors}
        expandedSources={expandedSources}
        onToggleSource={toggleSource}
      />
    </div>
  );
}

export default DataHealthPage
