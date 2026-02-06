import {
  getUserPreference as getCoreUserPreference,
  setUserPreference as setCoreUserPreference,
} from '../core/prefs/userPreferences'
import { appLogger } from '../runtime/adapters/appLogger'
import { createBrowserLocalStorageAdapter } from '../runtime/adapters/browserStorageAdapter'

const defaultDeps = {
  storage: createBrowserLocalStorageAdapter(),
  logger: appLogger,
}

export function getUserPreference<T>(key: string, fallback: T): T {
  return getCoreUserPreference(defaultDeps, key, fallback)
}

export function setUserPreference<T>(key: string, value: T): void {
  setCoreUserPreference(defaultDeps, key, value)
}
