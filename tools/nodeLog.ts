/**
 * Node-compatible logging utility
 *
 * Simple logger that works in Node.js without Vite/browser dependencies.
 * Used by CLI tools and scripts.
 */

export const log = {
  debug(message: string, ...args: unknown[]): void {
    console.log(`[DEBUG] ${message}`, ...args)
  },

  info(message: string, ...args: unknown[]): void {
    console.log(`[INFO] ${message}`, ...args)
  },

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args)
  },

  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args)
  }
}
