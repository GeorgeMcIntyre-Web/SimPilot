/**
 * Asset Badges
 *
 * Visual badges for equipment sourcing and reuse allocation status.
 * Used in the Assets tab to provide quick visual cues for Dale.
 *
 * Badge Categories:
 * - SourcingBadge: NEW_BUY, REUSE, MAKE, FREE_ISSUE, UNKNOWN
 * - ReuseStatusBadge: AVAILABLE, ALLOCATED, IN_USE, RESERVED
 * - AssetKindBadge: Robot, WeldGun, Riser, TipDresser, etc.
 */

import { cn } from '../../ui/lib/utils';
import type { EquipmentSourcing } from '../../domain/UnifiedModel';
import type { ReuseAllocationStatus, DetailedAssetKind } from '../../ingestion/excelIngestionTypes';
import type { WorkflowStage, BottleneckReason, BottleneckSeverity } from '../../domain/toolingBottleneckStore';
import { getBottleneckReasonLabel } from '../../domain/toolingBottleneckLabels';
import { Recycle, ShoppingCart, Hammer, HelpCircle, Package, CheckCircle, Clock, Lock, Bot, Zap, Wrench, Box, AlertTriangle } from 'lucide-react';

// ============================================================================
// SOURCING BADGE
// ============================================================================

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

export function SourcingBadge({ sourcing, showIcon = true, size = 'sm', className }: SourcingBadgeProps) {
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

// ============================================================================
// REUSE STATUS BADGE
// ============================================================================

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

export function ReuseStatusBadge({ status, showIcon = true, size = 'sm', className }: ReuseStatusBadgeProps) {
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

// ============================================================================
// ASSET KIND BADGE
// ============================================================================

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

export function AssetKindBadge({ kind, detailedKind, showIcon = true, size = 'sm', className }: AssetKindBadgeProps) {
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

// ============================================================================
// BOTTLENECK BADGE
// ============================================================================

type BottleneckBadgeInfo = {
  label: string;
  subLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
};

function getBottleneckBadgeInfo(stage: WorkflowStage, reason: BottleneckReason, severity: BottleneckSeverity): BottleneckBadgeInfo {
  const palette =
    severity === 'critical'
      ? {
          color: 'text-red-700 dark:text-red-300',
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          borderColor: 'border-red-200 dark:border-red-800',
        }
      : severity === 'warning'
        ? {
            color: 'text-amber-700 dark:text-amber-300',
            bgColor: 'bg-amber-100 dark:bg-amber-900/30',
            borderColor: 'border-amber-200 dark:border-amber-800',
          }
        : {
            color: 'text-blue-700 dark:text-blue-300',
            bgColor: 'bg-blue-100 dark:bg-blue-900/30',
            borderColor: 'border-blue-200 dark:border-blue-800',
          };

  const reasonInfo = getBottleneckReasonLabel(reason);

  return {
    label: `Blocked (${stage})`,
    subLabel: reasonInfo.shortLabel,
    ...palette,
  };
}

type BottleneckBadgeProps = {
  stage: WorkflowStage;
  reason: BottleneckReason;
  severity: BottleneckSeverity;
  className?: string;
};

export function BottleneckBadge({ stage, reason, severity, className }: BottleneckBadgeProps) {
  const info = getBottleneckBadgeInfo(stage, reason, severity);

  return (
    <span
    className={cn(
      'inline-flex flex-col rounded-lg border px-2 py-1 text-[11px] font-semibold leading-tight whitespace-nowrap',
      info.bgColor,
      info.color,
      info.borderColor,
      className
    )}
      title={getBottleneckReasonLabel(reason).description}
    >
      <span className="inline-flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        {info.label}
      </span>
      <span className="text-[10px] font-medium tracking-wide opacity-80">
        {info.subLabel}
      </span>
    </span>
  );
}
