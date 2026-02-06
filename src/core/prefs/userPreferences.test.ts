import { describe, expect, it, vi } from 'vitest'
import type { Logger } from '../adapters/Logger'
import type { StorageAdapter } from '../adapters/StorageAdapter'
import { getUserPreference, setUserPreference } from './userPreferences'

class MemoryStorage implements StorageAdapter {
  private readonly store = new Map<string, string>()

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }
}

function createSpyLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}

describe('core/prefs/userPreferences', () => {
  it('returns fallback when key missing', () => {
    const storage = new MemoryStorage()
    const value = getUserPreference({ storage }, 'missing', 123)
    expect(value).toBe(123)
  })

  it('returns parsed value when present', () => {
    const storage = new MemoryStorage()
    storage.setItem('k', JSON.stringify({ ok: true }))
    const value = getUserPreference({ storage }, 'k', { ok: false })
    expect(value).toEqual({ ok: true })
  })

  it('returns fallback on invalid JSON', () => {
    const storage = new MemoryStorage()
    storage.setItem('k', '{bad json')
    const value = getUserPreference({ storage }, 'k', { ok: false })
    expect(value).toEqual({ ok: false })
  })

  it('writes stable JSON with sorted keys', () => {
    const storage = new MemoryStorage()
    setUserPreference({ storage }, 'k', { b: 1, a: 2 })
    expect(storage.getItem('k')).toBe('{"a":2,"b":1}')
  })

  it('logs a warning when read throws', () => {
    const logger = createSpyLogger()
    const storage: StorageAdapter = {
      getItem: () => {
        throw new Error('boom')
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    }

    const value = getUserPreference({ storage, logger }, 'k', 'fallback')
    expect(value).toBe('fallback')
    expect(logger.warn).toHaveBeenCalled()
  })

  it('logs a warning when write throws', () => {
    const logger = createSpyLogger()
    const storage: StorageAdapter = {
      getItem: () => null,
      setItem: () => {
        throw new Error('boom')
      },
      removeItem: () => undefined,
    }

    setUserPreference({ storage, logger }, 'k', { ok: true })
    expect(logger.warn).toHaveBeenCalled()
  })
})
