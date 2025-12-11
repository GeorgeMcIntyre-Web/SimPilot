import { Recycle, ShoppingCart, Hammer, HelpCircle } from 'lucide-react';
import { cn } from '../../../ui/lib/utils';
import type { EquipmentSourcing } from '../../../domain/UnifiedModel';

type SourcingInfo = {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
};

export function getSourcingInfo(sourcing: EquipmentSourcing | 'FREE_ISSUE'): SourcingInfo {
  switch (sourcing) {
    case 'NEW_BUY':
      return {
        label: 'New Buy',
        color: 'text-purple-700 dark:text-purple-300',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        borderColor: 'border-purple-200 dark:border-purple-800',
        icon: <ShoppingCart className="w-3.5 h-3.5" />,
      };
    case 'REUSE':
    case 'FREE_ISSUE':
      return {
        label: sourcing === 'FREE_ISSUE' ? 'Free Issue' : 'Reuse',
        color: 'text-emerald-700 dark:text-emerald-300',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        icon: <Recycle className="w-3.5 h-3.5" />,
      };
    case 'MAKE':
      return {
        label: 'Make',
        color: 'text-blue-700 dark:text-blue-300',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        borderColor: 'border-blue-200 dark:border-blue-800',
        icon: <Hammer className="w-3.5 h-3.5" />,
      };
    case 'UNKNOWN':
    default:
      return {
        label: 'Unknown',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-700',
        borderColor: 'border-gray-200 dark:border-gray-600',
        icon: <HelpCircle className="w-3.5 h-3.5" />,
      };
  }
}

type SourcingBadgeProps = {
  sourcing: EquipmentSourcing | 'FREE_ISSUE';
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
};

export function SourcingBadge({
  sourcing,
  showIcon = true,
  size = 'sm',
  className,
}: SourcingBadgeProps) {
  const info = getSourcingInfo(sourcing);
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
    >
      {showIcon && info.icon}
      {info.label}
    </span>
  );
}
