/**
 * SIMPILOT LOGGING UTILITY
 *
 * Centralized logging helper for consistent error handling across the app.
 * Provides context-aware logging that works in both dev and prod environments.
 */

import { isDevelopment } from '../config/simpilotConfig';

/**
 * Format an unknown error into a displayable message
 *
 * @param error - Unknown error value
 * @returns Human-readable error message
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error === null) {
    return 'Unknown error (null)';
  }

  if (error === undefined) {
    return 'Unknown error (undefined)';
  }

  // Try to stringify objects
  try {
    const str = JSON.stringify(error);
    if (str.length > 200) {
      return str.slice(0, 200) + '...';
    }
    return str;
  } catch {
    return 'Unknown error (non-serializable)';
  }
}

/**
 * Get the stack trace from an error if available
 *
 * @param error - Unknown error value
 * @returns Stack trace string or undefined
 */
function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  return undefined;
}

/**
 * Log an error with context information
 *
 * In development: Full console.error with context and stack
 * In production: Console.error with context (future: could send to monitoring service)
 *
 * @param error - The error to log
 * @param context - Context string describing where the error occurred
 */
export function logError(error: unknown, context: string): void {
  const message = formatErrorMessage(error);
  const timestamp = new Date().toISOString();
  const prefix = `[SimPilot Error] ${timestamp} | ${context}`;

  // Always log to console (both dev and prod)
  console.error(`${prefix}:`, message);

  // In development, also log the full error object and stack
  if (isDevelopment()) {
    const stack = getErrorStack(error);
    if (stack) {
      console.error('Stack trace:', stack);
    }
    // Log full error object for debugging
    console.error('Full error:', error);
  }

  // Future: In production, could send to a monitoring service
  // if (isProduction() && monitoringService) {
  //   monitoringService.captureError(error, { context });
  // }
}

/**
 * Log a warning with context information
 *
 * @param message - Warning message
 * @param context - Context string describing where the warning occurred
 */
export function logWarning(message: string, context: string): void {
  const timestamp = new Date().toISOString();
  const prefix = `[SimPilot Warning] ${timestamp} | ${context}`;

  console.warn(`${prefix}:`, message);
}

/**
 * Log an info message (development only)
 *
 * @param message - Info message
 * @param context - Context string
 */
export function logInfo(message: string, context: string): void {
  if (!isDevelopment()) {
    return;
  }

  const timestamp = new Date().toISOString();
  const prefix = `[SimPilot Info] ${timestamp} | ${context}`;

  console.info(`${prefix}:`, message);
}
