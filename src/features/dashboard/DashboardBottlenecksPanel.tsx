import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { DashboardBottlenecksSummary } from './DashboardBottlenecksSummary';
import { selectWorstWorkflowBottlenecks } from '../../domain/simPilotSelectors';
import { useSimPilotStore } from '../../domain/simPilotStore';
import { EmptyState } from '../../ui/components/EmptyState';
import type { WorkflowBottleneckStatus } from '../../domain/workflowTypes';
import { PanelCard } from './bottlenecks/PanelCard';
import { FilterToolbar } from './bottlenecks/FilterToolbar';
import { BottleneckTable } from './bottlenecks/BottleneckTable';
import { BottleneckDetailModal } from './bottlenecks/BottleneckDetailModal';
import { useBottleneckFiltering } from './bottlenecks/useBottleneckFiltering';

interface DashboardBottlenecksPanelProps {
  variant?: 'standalone' | 'embedded';
}

export function DashboardBottlenecksPanel({
  variant = 'standalone',
}: DashboardBottlenecksPanelProps = {}) {
  const navigate = useNavigate();
  const simPilotState = useSimPilotStore();
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowBottleneckStatus | null>(null);

  // PHASE 3: Using generic workflow selectors, filtered to TOOLING kind only
  const allBottlenecks = useMemo(() => {
    return selectWorstWorkflowBottlenecks(simPilotState, 50);
  }, [simPilotState]);

  // Filter to TOOLING kind only (preserves current behavior, ready for WELD_GUN/ROBOT_CELL later)
  const worstBottlenecks = useMemo(() => {
    return allBottlenecks.filter((b) => b.kind === 'TOOLING').slice(0, 25);
  }, [allBottlenecks]);

  const {
    stageFilter,
    setStageFilter,
    reasonFilter,
    reasonOptions,
    filteredBottlenecks,
    summaryCounts,
    handleReasonToggle,
    handleClearReasons,
  } = useBottleneckFiltering(worstBottlenecks);

  const ContentWrapper = variant === 'embedded' ? 'div' : PanelCard;

  if (simPilotState.isLoading === true) {
    const loadingContent = (
      <div className="flex items-center justify-center py-12 gap-3 text-gray-500 dark:text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading tooling bottlenecks…</span>
      </div>
    );
    return variant === 'embedded' ? (
      loadingContent
    ) : (
      <ContentWrapper data-testid="bottlenecks-loading">{loadingContent}</ContentWrapper>
    );
  }

  const hasSnapshot = simPilotState.snapshot !== null;
  const hasAnyBottlenecks = worstBottlenecks.length > 0;

  if (hasSnapshot === false || hasAnyBottlenecks === false) {
    const emptyContent = (
      <EmptyState
        title="No tooling bottlenecks"
        message="Load data in the Data Loader to see bottleneck trends across tooling workflows."
      />
    );
    return variant === 'embedded' ? (
      emptyContent
    ) : (
      <ContentWrapper data-testid="bottlenecks-empty">{emptyContent}</ContentWrapper>
    );
  }

  const handleOpenSimulation = (status: WorkflowBottleneckStatus) => {
    // Parse simulation context key (format: Program|Plant|Unit|Line|Station)
    const parts = status.simulationContextKey.split('|');
    if (parts.length === 5) {
      const params = new URLSearchParams();
      params.set('program', parts[0]);
      params.set('plant', parts[1]);
      params.set('unit', parts[2]);
      params.set('line', parts[3]);
      params.set('station', parts[4]);
      navigate(`/simulation?${params.toString()}`);
    }
  };

  const handleOpenDrawer = (status: WorkflowBottleneckStatus) => {
    setActiveWorkflow(status);
  };

  const handleCloseDrawer = () => {
    setActiveWorkflow(null);
  };

  const updatedAt = simPilotState.snapshot?.workflowBottleneckSnapshot.generatedAt;

  const content = (
    <div className="space-y-3" data-testid="bottlenecks-panel">
      <DashboardBottlenecksSummary
        total={worstBottlenecks.length}
        highCount={summaryCounts.high}
        mediumCount={summaryCounts.medium}
        lowCount={summaryCounts.low}
        activeStage={stageFilter}
        updatedAt={updatedAt}
      />

      <FilterToolbar
        stageFilter={stageFilter}
        onStageChange={setStageFilter}
        reasonFilter={reasonFilter}
        onReasonToggle={handleReasonToggle}
        onClearReasons={handleClearReasons}
        reasons={reasonOptions}
      />

      {filteredBottlenecks.length === 0 ? (
        <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          No bottlenecks match the current filters. Try switching stages or clearing the reasons.
        </div>
      ) : (
        <div className="pt-2">
          <BottleneckTable
            bottlenecks={filteredBottlenecks}
            onOpenSimulation={handleOpenSimulation}
            onOpenDetail={handleOpenDrawer}
          />
        </div>
      )}
    </div>
  );

  return (
    <>
      {variant === 'embedded' ? (
        content
      ) : (
        <PanelCard data-testid="bottlenecks-panel-wrapper">{content}</PanelCard>
      )}
      <BottleneckDetailModal workflow={activeWorkflow} onClose={handleCloseDrawer} />
    </>
  );
}
