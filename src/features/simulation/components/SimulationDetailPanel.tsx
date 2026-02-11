// Simulation Detail Panel
// Persistent side panel showing full station context and related assets
// Used in split view layout (not a drawer)

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import type { StationContext } from '../simulationStore';
import { PanelHeader } from './detailPanel/PanelHeader';
import { TabNavigation } from './detailPanel/TabNavigation';
import { OverviewTabContent } from './detailPanel/OverviewTabContent';
import { AssetsTabContent } from './detailPanel/AssetsTabContent';

type TabView = 'overview' | 'assets';

interface SimulationDetailPanelProps {
  station: StationContext | null;
  onClose: () => void;
}

function EmptyState() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
      <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
        No Station Selected
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Select a station from the list to view details
      </p>
    </div>
  );
}

export function SimulationDetailPanel({ station, onClose }: SimulationDetailPanelProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabView>('overview');

  if (station === null) {
    return <EmptyState />;
  }

  const handleViewAssets = () => {
    // Navigate to assets page with station filter in query params
    const params = new URLSearchParams();
    params.set('station', station.station);
    params.set('line', station.line);
    navigate(`/assets?${params.toString()}`);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <PanelHeader
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
        <div className="p-3 space-y-3">
          {activeTab === 'overview' && (
            <OverviewTabContent station={station} onViewAssets={handleViewAssets} />
          )}
          {activeTab === 'assets' && <AssetsTabContent station={station} />}
        </div>
      </div>
    </div>
  );
}
