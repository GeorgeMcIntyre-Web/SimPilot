import { Package, Clock, CheckCircle, Lock, HelpCircle } from 'lucide-react';
import { cn } from '../../../ui/lib/utils';
import type { ReuseAllocationStatus } from '../../../ingestion/excelIngestionTypes';

type ReuseStatusInfo = {
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
};

export function getReuseStatusInfo(status: ReuseAllocationStatus): ReuseStatusInfo {
  switch (status) {
    case 'AVAILABLE':
      return {
        label: 'Available',
        description: 'In pool, ready for allocation',
        color: 'text-green-700 dark:text-green-300',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        borderColor: 'border-green-200 dark:border-green-800',
        icon: <Package className="w-3.5 h-3.5" />,
      };
    case 'ALLOCATED':
      return {
        label: 'Allocated',
        description: 'Planned for new line',
        color: 'text-blue-700 dark:text-blue-300',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        borderColor: 'border-blue-200 dark:border-blue-800',
        icon: <Clock className="w-3.5 h-3.5" />,
      };
    case 'IN_USE':
      return {
        label: 'In Use',
        description: 'Installed on new line',
        color: 'text-emerald-700 dark:text-emerald-300',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        icon: <CheckCircle className="w-3.5 h-3.5" />,
      };
    case 'RESERVED':
      return {
        label: 'Reserved',
        description: 'Reserved for specific project',
        color: 'text-amber-700 dark:text-amber-300',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        borderColor: 'border-amber-200 dark:border-amber-800',
        icon: <Lock className="w-3.5 h-3.5" />,
      };
    case 'UNKNOWN':
    default:
      return {
        label: 'Unknown',
        description: 'Status not determined',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-700',
        borderColor: 'border-gray-200 dark:border-gray-600',
        icon: <HelpCircle className="w-3.5 h-3.5" />,
      };
  }
}

type ReuseStatusBadgeProps = {
  status: ReuseAllocationStatus;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
};

export function ReuseStatusBadge({
  status,
  showIcon = true,
  size = 'sm',
  className,
}: ReuseStatusBadgeProps) {
  const info = getReuseStatusInfo(status);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium border whitespace-nowrap',
        info.bgColor,
        info.color,
        info.borderColor,
        sizeClasses,
        className
      )}
      title={info.description}
    >
      {showIcon && info.icon}
      {info.label}
    </span>
  );
}
