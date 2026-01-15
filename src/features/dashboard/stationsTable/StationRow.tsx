import { cn } from '../../../ui/lib/utils';
import { CellSnapshot } from '../../../domain/crossRef/CrossRefTypes';
import { RiskBadge } from '../../../ui/components/BadgePill';
import { getRiskLevel, getCompletionPercent } from '../dashboardUtils';

type Density = 'comfortable' | 'compact';

interface StationRowProps {
  cell: CellSnapshot;
  density: Density;
  onClick: () => void;
}

export function StationRow({ cell, onClick, density }: StationRowProps) {
  const riskLevel = getRiskLevel(cell.flags);
  const completion = getCompletionPercent(cell);
  const application = cell.simulationStatus?.application ?? '-';
  const robotCount = cell.robots?.length ?? 0;
  const rowPad = density === 'compact' ? 'py-3' : 'py-4';
  const textSize = density === 'compact' ? 'text-xs' : 'text-sm';

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <td className={cn('whitespace-nowrap pl-4 pr-3 sm:pl-6', rowPad, textSize)}>
        <span className="font-medium text-gray-900 dark:text-white block truncate max-w-[200px]">
          {cell.stationKey}
        </span>
      </td>
      <td className={cn('whitespace-nowrap px-3 text-gray-500 dark:text-gray-400', rowPad, textSize)}>
        {cell.areaKey ?? 'Unknown'}
      </td>
      <td className={cn('whitespace-nowrap px-3 text-gray-500 dark:text-gray-400', rowPad, textSize)}>
        {application}
      </td>
      <td className={cn('whitespace-nowrap px-3 text-gray-700 dark:text-gray-300', rowPad, textSize)}>
        {robotCount}
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
      <td className={cn('whitespace-nowrap px-3', rowPad, textSize)}>
        {cell.flags.length > 0 ? (
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
            {cell.flags.length}
          </span>
        ) : (
          <span className="text-gray-400">0</span>
        )}
      </td>
      <td className={cn('whitespace-nowrap px-3', rowPad, textSize)}>
        <RiskBadge riskLevel={riskLevel} />
      </td>
    </tr>
  );
}
