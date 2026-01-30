import { ArrowUpDown } from 'lucide-react';
import { cn } from '../../../ui/lib/utils';
import { SortKey, SortDirection } from '../dashboardUtils';

interface SortableHeaderProps {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  direction: SortDirection;
  onSort: (key: SortKey) => void;
  className?: string;
}

export function SortableHeader({
  label,
  sortKey,
  currentSort,
  direction,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentSort === sortKey;

  return (
    <button
      onClick={() => onSort(sortKey)}
      className={cn(
        'flex items-center gap-1 typography-label hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors',
        isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white',
        className
      )}
    >
      <span>{label}</span>
      <ArrowUpDown className={cn('h-3.5 w-3.5', isActive ? 'opacity-100' : 'opacity-50')} />
      {isActive && <span className="text-xs text-gray-400">{direction === 'asc' ? '↑' : '↓'}</span>}
    </button>
  );
}
