import { BarChart3, Package, FileSpreadsheet } from 'lucide-react';
import { cn } from '../../../../ui/lib/utils';

type TabView = 'overview' | 'assets' | 'simulation';

interface TabNavigationProps {
  activeTab: TabView;
  assetCount: number;
  onTabChange: (tab: TabView) => void;
  showSimulationTab?: boolean;
}

export function TabNavigation({ activeTab, assetCount, onTabChange, showSimulationTab = true }: TabNavigationProps) {
  return (
    <div className="flex border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={() => onTabChange('overview')}
        className={cn(
          'flex-1 px-3 py-2 text-xs font-medium transition-colors border-b-2',
          'flex items-center justify-center gap-1.5',
          activeTab === 'overview'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
            : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
        )}
      >
        <BarChart3 className="h-3.5 w-3.5" />
        Overview
      </button>
      <button
        onClick={() => onTabChange('assets')}
        className={cn(
          'flex-1 px-3 py-2 text-xs font-medium transition-colors border-b-2',
          'flex items-center justify-center gap-1.5',
          activeTab === 'assets'
            ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
            : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
        )}
      >
        <Package className="h-3.5 w-3.5" />
        Assets ({assetCount})
      </button>
      {showSimulationTab && (
        <button
          onClick={() => onTabChange('simulation')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors border-b-2',
            'flex items-center justify-center gap-1.5',
            activeTab === 'simulation'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          )}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Simulation
        </button>
      )}
    </div>
  );
}
