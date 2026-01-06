/**
 * SIMPILOT LOGGING LIBRARY
 *
 * Lightweight logging wrapper for consistent, environment-aware logging.
 *
 * - In production: debug/info are no-ops, warn/error always emit
 * - In development: all levels emit to console
 * - No external logging service (keep it simple)
 *
 * Usage:
 *   import { log } from '@/lib/log'
 *
 *   log.debug('Detailed debug info', { data })
 *   log.info('Informational message')
 *   log.warn('Warning message')
 *   log.error('Error message', error)
 */

import { isDevelopment } from '../config/simpilotConfig';

export const log = {
  /**
   * Debug-level logging (development only)
   * Use for verbose diagnostic information
   */
  debug(message: string, ...args: unknown[]): void {
    if (!isDevelopment()) return;
    console.log(`[DEBUG] ${message}`, ...args);
  },

  /**
   * Info-level logging (development only)
   * Use for general informational messages
   */
  info(message: string, ...args: unknown[]): void {
    if (!isDevelopment()) return;
    console.log(`[INFO] ${message}`, ...args);
  },

  /**
   * Warning-level logging (always emits)
   * Use for recoverable issues that need attention
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  },

  /**
   * Error-level logging (always emits)
   * Use for errors and exceptions
   */
  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  },
};

/**
 * Re-export existing logger utilities for compatibility
 */
export { logError, logWarning, logInfo, formatErrorMessage } from '../utils/logger';
