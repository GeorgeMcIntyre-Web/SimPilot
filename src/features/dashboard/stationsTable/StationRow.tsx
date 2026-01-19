import { cn } from '../../../ui/lib/utils';
import { CellSnapshot } from '../../../domain/crossRef/CrossRefTypes';
import { getCompletionPercent } from '../dashboardUtils';

type Density = 'comfortable' | 'compact';

interface StationRowProps {
  cell: CellSnapshot;
  density: Density;
  onClick: () => void;
}

export function StationRow({ cell, onClick, density }: StationRowProps) {
  const completion = getCompletionPercent(cell);
  const application = cell.simulationStatus?.application ?? '-';
  const robotCount = cell.robots?.length ?? 0;
  const issueCount = cell.flags?.length ?? 0;
  const rowPad = density === 'compact' ? 'py-3' : 'py-4';
  const textSize = density === 'compact' ? 'text-xs' : 'text-sm';

  const status = (() => {
    if (completion === null) {
      return { label: 'No data', className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' }
    }
    if (completion >= 95) {
      return { label: 'Complete', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200' }
    }
    if (completion >= 80) {
      return { label: 'Nearly Complete', className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200' }
    }
    if (completion >= 60) {
      return { label: 'On Track', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200' }
    }
    if (completion >= 30) {
      return { label: 'In Progress', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200' }
    }
    if (completion > 0) {
      return { label: 'Starting', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200' }
    }
    return { label: 'Not Started', className: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200' }
  })()

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
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full px-2.5 py-1 font-semibold min-w-[2.5rem]',
            issueCount > 0
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
          )}
        >
          {issueCount}
        </span>
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
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 font-medium', status.className)}>
          {status.label}
        </span>
      </td>
    </tr>
  );
}
