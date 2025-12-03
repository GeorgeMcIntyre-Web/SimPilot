import type { BottleneckReason } from './toolingBottleneckStore'

export interface BottleneckLabel {
  label: string
  shortLabel: string
  description: string
}

const LABEL_MAP: Record<BottleneckReason, BottleneckLabel> = {
  BUILD_AHEAD_OF_SIM: {
    label: 'Build ahead of simulation',
    shortLabel: 'BUILD AHEAD',
    description: 'Tool build is progressing faster than SIM approvals'
  },
  SIM_CHANGES_REQUESTED: {
    label: 'Simulation changes requested',
    shortLabel: 'SIM BLOCKED',
    description: 'Simulation requested corrections that block tooling'
  },
  DESIGN_NEEDS_UPDATES: {
    label: 'Design needs updates',
    shortLabel: 'DESIGN BLOCK',
    description: 'Design package is incomplete or rejected'
  },
  ROBOT_PATHS_PENDING: {
    label: 'Robot paths pending',
    shortLabel: 'ROBOT PATHS',
    description: 'Robots are waiting on updated paths or reach studies'
  },
  WAITING_ON_FIXTURES: {
    label: 'Waiting on fixtures',
    shortLabel: 'FIXTURES WAIT',
    description: 'Fixtures or risers not released'
  },
  UNSPECIFIED: {
    label: 'Unspecified bottleneck',
    shortLabel: 'BLOCKED',
    description: 'Bottleneck detected without provided reason'
  }
}

export function getBottleneckReasonLabel(reason: BottleneckReason): BottleneckLabel {
  return LABEL_MAP[reason] ?? LABEL_MAP.UNSPECIFIED
}
