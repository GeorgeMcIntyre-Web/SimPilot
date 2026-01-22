// Metadata helpers
// Case-insensitive metadata lookup to handle inconsistent Excel header casing

export function getMetadataValue<T>(
  asset: { metadata?: Record<string, unknown> },
  key: string
): T | undefined {
  const metadata = asset.metadata;
  if (!metadata) return undefined;

  const direct = metadata[key];
  if (direct !== null && direct !== undefined) {
    return direct as T;
  }

  const targetKey = key.toLowerCase();
  for (const [metaKey, metaValue] of Object.entries(metadata)) {
    if (metaValue === null || metaValue === undefined) continue;
    if (metaKey.toLowerCase() === targetKey) {
      return metaValue as T;
    }
  }

  return undefined;
}
