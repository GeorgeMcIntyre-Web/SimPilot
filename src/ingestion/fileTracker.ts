// File Tracker for detecting duplicate uploads and tracking file history
// Addresses DATA_INTEGRITY_ISSUES.md - Issue #1: Checksum/Hash Verification

/**
 * Metadata for a tracked file upload
 */
export interface FileTracker {
  hash: string              // SHA-256 hash of file content
  fileName: string          // Original file name
  uploadedAt: string        // ISO timestamp
  fileSize: number          // File size in bytes
  processedEntities: string[] // IDs of entities created from this file
}

/**
 * Storage for file tracking history
 */
class FileTrackingStore {
  private trackers: FileTracker[] = []

  /**
   * Add a new file tracker
   */
  add(tracker: FileTracker): void {
    this.trackers.push(tracker)
  }

  /**
   * Check if a file hash already exists
   */
  isDuplicate(hash: string): boolean {
    return this.trackers.some(t => t.hash === hash)
  }

  /**
   * Get tracker by hash
   */
  getByHash(hash: string): FileTracker | undefined {
    return this.trackers.find(t => t.hash === hash)
  }

  /**
   * Get all trackers
   */
  getAll(): FileTracker[] {
    return [...this.trackers]
  }

  /**
   * Clear all tracking history
   */
  clear(): void {
    this.trackers = []
  }

  /**
   * Get entities created by a specific file
   */
  getEntitiesFromFile(hash: string): string[] {
    const tracker = this.getByHash(hash)
    return tracker ? tracker.processedEntities : []
  }
}

// Global file tracking store
export const fileTrackingStore = new FileTrackingStore()

/**
 * Generate SHA-256 hash for a file
 *
 * @param file - File object to hash
 * @returns Promise resolving to hex-encoded hash string
 */
export async function generateFileHash(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  } catch (error) {
    console.error('[FileTracker] Failed to generate file hash:', error)
    // Fallback: use file name + size + timestamp as pseudo-hash
    return `fallback-${file.name}-${file.size}-${Date.now()}`
  }
}

/**
 * Check if a file has been uploaded before
 *
 * @param file - File to check
 * @returns Promise resolving to true if file is a duplicate
 */
export async function isDuplicateFile(file: File): Promise<boolean> {
  const hash = await generateFileHash(file)
  return fileTrackingStore.isDuplicate(hash)
}

/**
 * Track a newly uploaded file
 *
 * @param file - File being uploaded
 * @param entityIds - IDs of entities created from this file
 * @returns Promise resolving to the file tracker
 */
export async function trackUploadedFile(
  file: File,
  entityIds: string[]
): Promise<FileTracker> {
  const hash = await generateFileHash(file)

  const tracker: FileTracker = {
    hash,
    fileName: file.name,
    uploadedAt: new Date().toISOString(),
    fileSize: file.size,
    processedEntities: entityIds
  }

  fileTrackingStore.add(tracker)
  return tracker
}

/**
 * Get information about a previous upload
 *
 * @param file - File to look up
 * @returns Promise resolving to tracker if file was uploaded before, undefined otherwise
 */
export async function getUploadInfo(file: File): Promise<FileTracker | undefined> {
  const hash = await generateFileHash(file)
  return fileTrackingStore.getByHash(hash)
}

/**
 * Clear all file tracking history
 * Call this when user explicitly clears all data
 */
export function clearFileTrackingHistory(): void {
  fileTrackingStore.clear()
}

/**
 * Get all tracked files
 */
export function getFileTrackingHistory(): FileTracker[] {
  return fileTrackingStore.getAll()
}
