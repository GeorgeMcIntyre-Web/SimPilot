/**
 * Runtime Environment Abstraction
 *
 * Provides unified access to environment variables that works in both:
 * - Vite/browser context (import.meta.env)
 * - Node.js context (process.env)
 *
 * This allows ingestion code to run headlessly in Node without Vite.
 */

export interface RuntimeEnv {
  MODE: string
  DEV: boolean
  PROD: boolean
}

let cachedEnv: RuntimeEnv | null = null

/**
 * Get runtime environment with safe fallbacks for Node.js
 *
 * In Vite/browser:
 *   - Reads from import.meta.env
 *
 * In Node.js:
 *   - Returns defaults (development mode)
 *   - Can read from process.env if needed
 */
export function getRuntimeEnv(): RuntimeEnv {
  if (cachedEnv) {
    return cachedEnv
  }

  // Detect environment
  const isVite = typeof import.meta !== 'undefined' && import.meta.env

  if (isVite) {
    // Vite/browser context
    cachedEnv = {
      MODE: import.meta.env.MODE || 'development',
      DEV: import.meta.env.DEV !== false,
      PROD: import.meta.env.PROD === true
    }
  } else {
    // Node.js context - use safe defaults
    const nodeEnv = typeof process !== 'undefined' ? process.env.NODE_ENV : undefined
    const isDev = !nodeEnv || nodeEnv === 'development'

    cachedEnv = {
      MODE: nodeEnv || 'development',
      DEV: isDev,
      PROD: !isDev
    }
  }

  return cachedEnv
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return getRuntimeEnv().DEV
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return getRuntimeEnv().PROD
}
