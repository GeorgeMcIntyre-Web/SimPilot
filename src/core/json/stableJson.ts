function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep)
  }

  if (value === null) {
    return null
  }

  if (typeof value !== 'object') {
    return value
  }

  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  const sorted: Record<string, unknown> = {}

  for (const key of keys) {
    sorted[key] = sortKeysDeep(record[key])
  }

  return sorted
}

export function stableJsonStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value))
}

export function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
