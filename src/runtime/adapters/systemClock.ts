import type { Clock } from '../../core/adapters/Clock'

export const systemClock: Clock = {
  nowMs: () => Date.now(),
}
