import { X, Layers } from 'lucide-react';

interface PanelHeaderProps {
  stationName: string;
  line: string;
  unit: string;
  onClose: () => void;
}

export function PanelHeader({ stationName, line, unit, onClose }: PanelHeaderProps) {
  return (
    <div className="px-4 py-2.5">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {stationName}
          </h2>
          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            <Layers className="h-3 w-3" />
            <span>{line}</span>
            <span>•</span>
            <span>{unit}</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ml-2"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
