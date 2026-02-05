import type { Logger } from '../adapters/Logger'
import { noopLogger } from '../adapters/Logger'
import type { StorageAdapter } from '../adapters/StorageAdapter'
import { safeJsonParse, stableJsonStringify } from '../json/stableJson'

export interface PreferencesDeps {
  storage: StorageAdapter
  logger?: Logger
}

function getLogger(deps: PreferencesDeps): Logger {
  return deps.logger ?? noopLogger
}

export function getUserPreference<T>(deps: PreferencesDeps, key: string, fallback: T): T {
  try {
    const raw = deps.storage.getItem(key)
    if (raw === null) {
      return fallback
    }

    return safeJsonParse(raw, fallback)
  } catch (error) {
    getLogger(deps).warn('Preferences: failed to read', error)
    return fallback
  }
}

export function setUserPreference<T>(deps: PreferencesDeps, key: string, value: T): void {
  try {
    deps.storage.setItem(key, stableJsonStringify(value))
  } catch (error) {
    getLogger(deps).warn('Preferences: failed to write', error)
  }
}
