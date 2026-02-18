import { PageHeader } from '../../ui/components/PageHeader'
import { useCellDetailData } from './CellDetailPage/useCellDetailData'
import { Breadcrumbs } from './CellDetailPage/Breadcrumbs'
import { HeaderCard } from './CellDetailPage/HeaderCard'
import { RobotAssetsSection } from './CellDetailPage/RobotAssetsSection'
import { ToolsSection } from './CellDetailPage/ToolsSection'
import { FlagsSection } from './CellDetailPage/FlagsSection'
import { TraceabilitySection } from './CellDetailPage/TraceabilitySection'

export function CellDetailPage() {
  const state = useCellDetailData()

  if (!state.cell) {
    return (
      <div>
        <PageHeader title="Station Not Found" />
        <p className="text-gray-500">The station you are looking for does not exist.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="cell-detail-root">
      {/* Navigation & Actions */}
      <Breadcrumbs
        cell={state.cell}
        breadcrumbRootHref={state.breadcrumbRootHref}
        breadcrumbRootLabel={state.breadcrumbRootLabel}
        isAtRisk={state.isAtRisk}
      />

      {/* Main Header Card */}
      <HeaderCard
        cell={state.cell}
        isEditingEngineer={state.isEditingEngineer}
        selectedEngineer={state.selectedEngineer}
        allEngineers={state.allEngineers}
        handleEditEngineer={state.handleEditEngineer}
        handleSaveEngineer={state.handleSaveEngineer}
        setIsEditingEngineer={state.setIsEditingEngineer}
        setSelectedEngineer={state.setSelectedEngineer}
        handleOpenSimulation={state.handleOpenSimulation}
      />

      {/* Secondary Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assets & Hardware Column */}
        <div className="lg:col-span-2 space-y-6">
          <RobotAssetsSection robots={state.robots} />
          <ToolsSection tools={state.mergedTools as any} mergedTools={state.mergedTools} />
        </div>

        {/* Intelligence & Quality Column */}
        <div className="space-y-6">
          <FlagsSection flags={state.crossRefFlags} />
          <TraceabilitySection cell={state.cell} />
        </div>
      </div>
    </div>
  )
}

export default CellDetailPage
