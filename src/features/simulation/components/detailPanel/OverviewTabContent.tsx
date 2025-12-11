import {
  Bot,
  Zap,
  Wrench,
  Package,
  RefreshCw,
  ShoppingCart,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { AssetCountRow } from '../SimulationDetailPieces';
import type { StationContext } from '../../simulationStore';
import { ChevronRight } from 'lucide-react';

interface OverviewTabContentProps {
  station: StationContext;
  onViewAssets: () => void;
}

export function OverviewTabContent({ station, onViewAssets }: OverviewTabContentProps) {
  return (
    <div className="space-y-3">
      {/* Hierarchy Breadcrumb */}
      <div className="flex flex-wrap items-center gap-1 text-xs p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded border border-blue-100 dark:border-blue-800">
        <span className="font-medium text-blue-900 dark:text-blue-100">{station.program}</span>
        <ChevronRight className="h-3 w-3 text-blue-400" />
        <span className="text-blue-800 dark:text-blue-200">{station.plant}</span>
        <ChevronRight className="h-3 w-3 text-blue-400" />
        <span className="text-blue-700 dark:text-blue-300">{station.unit}</span>
        <ChevronRight className="h-3 w-3 text-blue-400" />
        <span className="text-blue-700 dark:text-blue-300">{station.line}</span>
      </div>

      {/* Asset Summary Cards - Compact Grid */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded border border-purple-200 dark:border-purple-800">
          <Bot className="h-5 w-5 text-purple-600 dark:text-purple-400 mb-1" />
          <div className="text-xl font-bold text-purple-900 dark:text-purple-100">
            {station.assetCounts.robots}
          </div>
          <div className="text-[10px] text-purple-700 dark:text-purple-300">Robots</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-200 dark:border-yellow-800">
          <Zap className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mb-1" />
          <div className="text-xl font-bold text-yellow-900 dark:text-yellow-100">
            {station.assetCounts.guns}
          </div>
          <div className="text-[10px] text-yellow-700 dark:text-yellow-300">Guns</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
          <Wrench className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-1" />
          <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
            {station.assetCounts.tools}
          </div>
          <div className="text-[10px] text-blue-700 dark:text-blue-300">Tools</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/20 p-2 rounded border border-gray-200 dark:border-gray-600">
          <Package className="h-5 w-5 text-gray-600 dark:text-gray-400 mb-1" />
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {station.assetCounts.total}
          </div>
          <div className="text-[10px] text-gray-700 dark:text-gray-300">Total</div>
        </div>
      </div>

      {/* Sourcing Breakdown - More Compact */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <ShoppingCart className="h-3.5 w-3.5 text-gray-500" />
          <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300">Sourcing</h3>
        </div>
        <div className="space-y-1.5">
          <AssetCountRow
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            label="Reuse"
            count={station.sourcingCounts.reuse}
            color="text-emerald-600 dark:text-emerald-400"
          />
          <AssetCountRow
            icon={<ShoppingCart className="h-3.5 w-3.5" />}
            label="New Buy"
            count={station.sourcingCounts.newBuy}
            color="text-blue-600 dark:text-blue-400"
          />
          <AssetCountRow
            icon={<HelpCircle className="h-3.5 w-3.5" />}
            label="Free Issue"
            count={station.sourcingCounts.freeIssue}
            color="text-purple-600 dark:text-purple-400"
          />
          <AssetCountRow
            icon={<HelpCircle className="h-3.5 w-3.5" />}
            label="Unknown"
            count={station.sourcingCounts.unknown}
            color="text-gray-500 dark:text-gray-400"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onViewAssets}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View Assets in Detail
        </button>
      </div>
    </div>
  );
}
