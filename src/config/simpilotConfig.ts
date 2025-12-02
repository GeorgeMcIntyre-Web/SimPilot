/**
 * SIMPILOT CONFIGURATION
 *
 * Central configuration module for SimPilot application settings.
 * Provides runtime config values with environment variable support.
 */

/**
 * Get the default data root directory for Excel workbooks
 *
 * Reads from VITE_SIMPILOT_DATA_ROOT environment variable.
 * Falls back to empty string if not configured.
 *
 * @returns Data root path or empty string
 */
export function getDefaultDataRoot(): string {
  const envRoot = import.meta.env.VITE_SIMPILOT_DATA_ROOT;

  if (typeof envRoot !== 'string') {
    return '';
  }

  const trimmed = envRoot.trim();

  if (trimmed.length === 0) {
    return '';
  }

  return trimmed;
}

/**
 * Get application configuration
 *
 * @returns Configuration object with all settings
 */
export function getAppConfig() {
  return {
    dataRoot: getDefaultDataRoot()
  };
}
