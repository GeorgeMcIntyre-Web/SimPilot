import { Bot, Zap, Wrench, Box, Package, RefreshCw, ShoppingCart } from 'lucide-react';
import { cn } from '../../../../ui/lib/utils';
import type { StationContext } from '../../simulationStore';

interface AssetsTabProps {
  station: StationContext;
}

export function AssetsTab({ station }: AssetsTabProps) {
  if (station.assets.length === 0) {
    return (
      <div className="text-center py-6">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-xs">No assets linked to this station</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1 custom-scrollbar">
      <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
        <Package className="h-3.5 w-3.5" />
        Asset List ({station.assets.length})
      </h3>
      <div className="space-y-1.5">
        {station.assets.map((asset, idx) => (
          <div
            key={idx}
            className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
          >
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                {asset.kind === 'ROBOT' && <Bot className="h-4 w-4 text-purple-500" />}
                {asset.kind === 'GUN' && <Zap className="h-4 w-4 text-yellow-500" />}
                {asset.kind === 'TOOL' && <Wrench className="h-4 w-4 text-blue-500" />}
                {asset.kind !== 'ROBOT' &&
                  asset.kind !== 'GUN' &&
                  asset.kind !== 'TOOL' && <Box className="h-4 w-4 text-gray-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-xs text-gray-900 dark:text-white truncate">
                  {asset.name}
                </div>
                {asset.oemModel && (
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 truncate">
                    Model: {asset.oemModel}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-1">
                  {asset.sourcing && (
                    <span
                      className={cn(
                        'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium',
                        asset.sourcing === 'REUSE' &&
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
                        asset.sourcing === 'NEW_BUY' &&
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
                        asset.sourcing === 'UNKNOWN' &&
                          'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                      )}
                    >
                      {asset.sourcing === 'REUSE' && <RefreshCw className="h-2.5 w-2.5" />}
                      {asset.sourcing === 'NEW_BUY' && <ShoppingCart className="h-2.5 w-2.5" />}
                      {asset.sourcing}
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">{asset.kind}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
