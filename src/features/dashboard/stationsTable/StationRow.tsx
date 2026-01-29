import { Link } from 'react-router-dom';
import { cn } from '../../../ui/lib/utils';
import { CellSnapshot } from '../../../domain/crossRef/CrossRefTypes';
import { getCompletionPercent } from '../dashboardUtils';

type Density = 'comfortable' | 'compact';

interface StationRowProps {
  cell: CellSnapshot;
  density: Density;
  onClick: () => void;
}

const getStationLabel = (cell: CellSnapshot): string => {
  const rawStation =
    (cell.simulationStatus?.raw as any)?.stationCode ||
    cell.displayCode ||
    cell.stationKey ||
    '';
  const trimmed = typeof rawStation === 'string' ? rawStation.trim() : '';
  if (!trimmed) return '-';
  return trimmed.replace(/_/g, '-');
};

export function StationRow({ cell, onClick, density }: StationRowProps) {
  const completion = getCompletionPercent(cell);
  const stationLabel = getStationLabel(cell);
  const simulator = cell.simulationStatus?.engineer?.trim() || 'UNASSIGNED';
  // Align with Robot Status table: use text-sm and py-3 even in compact mode.
  const rowPad = density === 'compact' ? 'py-3' : 'py-3';
  const textSize = 'text-sm';

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <td className={cn('whitespace-nowrap pl-4 pr-3 sm:pl-6', rowPad, textSize)}>
        <Link
          to={`/cells/${encodeURIComponent(cell.stationKey)}`}
          className="font-medium text-blue-600 dark:text-blue-400 block truncate max-w-[200px] hover:underline"
          title={stationLabel === '-' ? undefined : stationLabel}
          onClick={(e) => {
            e.preventDefault();
            onClick();
          }}
        >
          {stationLabel}
        </Link>
      </td>
      <td className={cn('whitespace-nowrap px-3 text-gray-500 dark:text-gray-400', rowPad, textSize)}>
        {cell.areaKey ?? 'Unknown'}
      </td>
      <td className={cn('whitespace-nowrap px-3 text-gray-700 dark:text-gray-300', rowPad, textSize)} title={simulator}>
        {simulator === 'UNASSIGNED' ? (
          simulator
        ) : (
          <Link
            to={`/engineers?highlightEngineer=${encodeURIComponent(simulator)}`}
            className="text-blue-600 dark:text-blue-400 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {simulator}
          </Link>
        )}
      </td>

      <td className={cn('whitespace-nowrap px-3', rowPad, textSize)}>
        {completion !== null ? (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden',
                density === 'compact' ? 'w-14 h-1.5' : 'w-16 h-1.5'
              )}
            >
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  completion >= 90
                    ? 'bg-emerald-500'
                    : completion >= 50
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                )}
                style={{ width: `${completion}%` }}
              />
            </div>
            <span className="text-gray-700 dark:text-gray-300 font-medium">{completion}%</span>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
    </tr>
  );
}
