import { useState, useMemo } from 'react';
import { useCoreStore } from '../../../domain/coreStore';
import { useDataHealthStore, useReuseSummary, computeDataHealthMetrics } from '../../../domain/dataHealthStore';
import { parseErrorContext } from '../../../utils/dataHealthExport';

interface GroupedError {
  source: string;
  errors: Array<{
    message: string;
    sheet: string | null;
  }>;
}

export function useDataHealth() {
  const coreState = useCoreStore();
  const dataHealthState = useDataHealthStore();
  const reuseSummary = useReuseSummary();

  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

  // Combine warnings from coreStore with errors from dataHealthStore
  const allErrors = useMemo(() => {
    const coreWarnings = coreState.warnings || [];
    const healthErrors = dataHealthState.errors || [];
    return [...coreWarnings, ...healthErrors];
  }, [coreState.warnings, dataHealthState.errors]);

  // Compute data health metrics
  const metrics = useMemo(() => {
    return computeDataHealthMetrics(
      coreState.assets,
      dataHealthState.reuseSummary,
      dataHealthState.linkingStats,
      allErrors
    );
  }, [coreState.assets, dataHealthState.reuseSummary, dataHealthState.linkingStats, allErrors]);

  // Group errors by source (workbook/file)
  const groupedErrors = useMemo((): GroupedError[] => {
    const groups: Record<string, Array<{ message: string; sheet: string | null }>> = {};

    allErrors.forEach((error) => {
      const { workbookId, sheet, cleanMessage } = parseErrorContext(error);
      const source = workbookId ?? 'Unknown Source';

      if (groups[source] === undefined) {
        groups[source] = [];
      }

      groups[source].push({
        message: cleanMessage,
        sheet,
      });
    });

    return Object.entries(groups).map(([source, errors]) => ({
      source,
      errors,
    }));
  }, [allErrors]);

  // Handlers
  const toggleSource = (source: string) => {
    const next = new Set(expandedSources);

    if (next.has(source)) {
      next.delete(source);
      setExpandedSources(next);
      return;
    }

    next.add(source);
    setExpandedSources(next);
  };

  // Check if we have any data
  const hasData = coreState.assets.length > 0 || allErrors.length > 0 || reuseSummary.total > 0;

  return {
    metrics,
    reuseSummary,
    groupedErrors,
    expandedSources,
    toggleSource,
    hasData,
    allErrors,
  };
}
