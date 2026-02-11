// Simulation Detail Drawer
// Side panel showing full station context and related assets
// Provides action to view assets in Assets tab

import { useState } from 'react';
import { ExternalLink, AlertTriangle, ChevronRight } from 'lucide-react';
import { cn } from '../../../ui/lib/utils';
import type { StationContext } from '../simulationStore';
import { DrawerHeader } from './drawer/DrawerHeader';
import { TabNavigation, type TabView } from './drawer/TabNavigation';
import { OverviewTab } from './drawer/OverviewTab';
import { AssetsTab } from './drawer/AssetsTab';
import { useDrawerNavigation } from './drawer/useDrawerNavigation';

interface SimulationDetailDrawerProps {
  station: StationContext | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SimulationDetailDrawer({
  station,
  isOpen,
  onClose,
}: SimulationDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabView>('overview');
  const [_isToolingDrawerOpen, setIsToolingDrawerOpen] = useState(false);

  const { handleViewAssets } = useDrawerNavigation(onClose);

  if (station === null) return null;

  // TODO(George): Re-enable bottleneck integration after migrating to generic workflow system
  const toolingBottlenecks: any[] = [];
  const hasToolingBottlenecks = toolingBottlenecks.length > 0;

  const handleOpenGeneralAssets = () => {
    handleViewAssets(station.station, station.line);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl z-50',
          'transform transition-transform duration-300 ease-out',
          'overflow-y-auto flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        data-testid="simulation-detail-drawer"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
          <DrawerHeader
            stationName={station.station}
            line={station.line}
            unit={station.unit}
            onClose={onClose}
          />

          {/* Tabs */}
          <TabNavigation
            activeTab={activeTab}
            assetCount={station.assetCounts.total}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-3 py-3 space-y-3">
            {/* Context Breadcrumb */}
            <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded p-2 border border-blue-100 dark:border-blue-800">
              <div className="flex flex-wrap items-center gap-1 text-xs text-gray-700 dark:text-gray-300">
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  {station.program}
                </span>
                <ChevronRight className="h-3 w-3 text-blue-400" />
                <span className="text-blue-800 dark:text-blue-200">{station.plant}</span>
                <ChevronRight className="h-3 w-3 text-blue-400" />
                <span className="text-blue-700 dark:text-blue-300">{station.unit}</span>
                <ChevronRight className="h-3 w-3 text-blue-400" />
                <span className="text-blue-700 dark:text-blue-300">{station.line}</span>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && <OverviewTab station={station} />}
            {activeTab === 'assets' && <AssetsTab station={station} />}

            {/* Actions */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
              {hasToolingBottlenecks && (
                <button
                  onClick={() => setIsToolingDrawerOpen(true)}
                  className={cn(
                    'w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded border text-xs font-medium',
                    'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
                    'bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors'
                  )}
                  data-testid="view-tooling-bottlenecks"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  View Tooling Bottlenecks
                </button>
              )}
              <button
                onClick={handleOpenGeneralAssets}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View All Assets
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
