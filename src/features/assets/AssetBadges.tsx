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
 * - BottleneckBadge: Workflow stage bottlenecks with severity
 */

// Re-export all badge components
export { SourcingBadge, getSourcingInfo } from './badges/SourcingBadge';
export { ReuseStatusBadge, getReuseStatusInfo } from './badges/ReuseStatusBadge';
export { AssetKindBadge, getAssetKindInfo } from './badges/AssetKindBadge';
export { BottleneckBadge } from './badges/BottleneckBadge';
