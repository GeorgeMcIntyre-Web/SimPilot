import { useMemo, useState } from 'react';
import type {
  WorkflowBottleneckStatus,
  WorkflowStage,
  WorkflowBottleneckReason,
} from '../../../domain/workflowTypes';
import { formatReason } from './bottleneckUtils';

interface ReasonOption {
  value: WorkflowBottleneckReason;
  label: string;
}

export function useBottleneckFiltering(worstBottlenecks: WorkflowBottleneckStatus[]) {
  const [stageFilter, setStageFilter] = useState<WorkflowStage | 'ALL'>('ALL');
  const [reasonFilter, setReasonFilter] = useState<WorkflowBottleneckReason[]>([]);

  const reasonOptions: ReasonOption[] = useMemo(() => {
    const unique = new Set<WorkflowBottleneckReason>();
    for (const status of worstBottlenecks) {
      unique.add(status.bottleneckReason);
    }
    return Array.from(unique).map((reason) => ({
      value: reason,
      label: formatReason(reason),
    }));
  }, [worstBottlenecks]);

  const filteredBottlenecks = useMemo(() => {
    return worstBottlenecks
      .filter((status) => {
        if (stageFilter !== 'ALL' && status.dominantStage !== stageFilter) {
          return false;
        }
        if (reasonFilter.length > 0 && reasonFilter.includes(status.bottleneckReason) === false) {
          return false;
        }
        return true;
      })
      .slice(0, 10);
  }, [worstBottlenecks, stageFilter, reasonFilter]);

  const summaryCounts = useMemo(() => {
    let high = 0;
    let medium = 0;
    let low = 0;
    for (const status of worstBottlenecks) {
      const severity = status.severity.toUpperCase();
      if (severity === 'CRITICAL' || severity === 'HIGH') {
        high += 1;
        continue;
      }
      if (severity === 'MEDIUM') {
        medium += 1;
        continue;
      }
      if (severity === 'LOW') {
        low += 1;
        continue;
      }
    }
    return { high, medium, low };
  }, [worstBottlenecks]);

  const handleReasonToggle = (reason: WorkflowBottleneckReason) => {
    setReasonFilter((prev) => {
      const exists = prev.includes(reason);
      if (exists === true) {
        return prev.filter((r) => r !== reason);
      }
      return [...prev, reason];
    });
  };

  const handleClearReasons = () => {
    setReasonFilter([]);
  };

  return {
    stageFilter,
    setStageFilter,
    reasonFilter,
    reasonOptions,
    filteredBottlenecks,
    summaryCounts,
    handleReasonToggle,
    handleClearReasons,
  };
}
