import { Bot, Zap, Wrench, Box } from 'lucide-react';
import { cn } from '../../../ui/lib/utils';
import type { DetailedAssetKind } from '../../../ingestion/excelIngestionTypes';

type AssetKindInfo = {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
};

export function getAssetKindInfo(kind: string, detailedKind?: DetailedAssetKind): AssetKindInfo {
  // Use detailed kind if available for more specific labeling
  if (detailedKind !== undefined) {
    switch (detailedKind) {
      case 'Robot':
        return {
          label: 'Robot',
          color: 'text-purple-700 dark:text-purple-300',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30',
          icon: <Bot className="w-3.5 h-3.5" />,
        };
      case 'WeldGun':
      case 'TMSGun':
        return {
          label: detailedKind === 'TMSGun' ? 'TMS Gun' : 'Weld Gun',
          color: 'text-yellow-700 dark:text-yellow-300',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
          icon: <Zap className="w-3.5 h-3.5" />,
        };
      case 'Riser':
        return {
          label: 'Riser',
          color: 'text-cyan-700 dark:text-cyan-300',
          bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
          icon: <Box className="w-3.5 h-3.5" />,
        };
      case 'TipDresser':
        return {
          label: 'Tip Dresser',
          color: 'text-pink-700 dark:text-pink-300',
          bgColor: 'bg-pink-100 dark:bg-pink-900/30',
          icon: <Wrench className="w-3.5 h-3.5" />,
        };
      case 'Gripper':
        return {
          label: 'Gripper',
          color: 'text-orange-700 dark:text-orange-300',
          bgColor: 'bg-orange-100 dark:bg-orange-900/30',
          icon: <Wrench className="w-3.5 h-3.5" />,
        };
      case 'Fixture':
        return {
          label: 'Fixture',
          color: 'text-indigo-700 dark:text-indigo-300',
          bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
          icon: <Box className="w-3.5 h-3.5" />,
        };
      case 'Measurement':
        return {
          label: 'Measurement',
          color: 'text-teal-700 dark:text-teal-300',
          bgColor: 'bg-teal-100 dark:bg-teal-900/30',
          icon: <Box className="w-3.5 h-3.5" />,
        };
    }
  }

  // Fall back to basic kind
  switch (kind) {
    case 'ROBOT':
      return {
        label: 'Robot',
        color: 'text-purple-700 dark:text-purple-300',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        icon: <Bot className="w-3.5 h-3.5" />,
      };
    case 'GUN':
      return {
        label: 'Gun',
        color: 'text-yellow-700 dark:text-yellow-300',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        icon: <Zap className="w-3.5 h-3.5" />,
      };
    case 'TOOL':
      return {
        label: 'Tool',
        color: 'text-blue-700 dark:text-blue-300',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        icon: <Wrench className="w-3.5 h-3.5" />,
      };
    case 'OTHER':
    default:
      return {
        label: 'Other',
        color: 'text-gray-600 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-700',
        icon: <Box className="w-3.5 h-3.5" />,
      };
  }
}

type AssetKindBadgeProps = {
  kind: string;
  detailedKind?: DetailedAssetKind;
  showIcon?: boolean;
  size?: 'sm' | 'md';
  className?: string;
};

export function AssetKindBadge({
  kind,
  detailedKind,
  showIcon = true,
  size = 'sm',
  className,
}: AssetKindBadgeProps) {
  const info = getAssetKindInfo(kind, detailedKind);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded font-medium',
        info.bgColor,
        info.color,
        sizeClasses,
        className
      )}
    >
      {showIcon && info.icon}
      {info.label}
    </span>
  );
}
