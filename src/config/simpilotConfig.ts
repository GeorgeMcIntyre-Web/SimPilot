/**
 * SIMPILOT CONFIGURATION
 *
 * Central configuration module for SimPilot application settings.
 * Provides runtime config values with environment variable support.
 */

/**
 * Application environment mode
 */
export type AppEnvironment = 'development' | 'preview' | 'production';

/**
 * Determine the current application environment
 *
 * @returns The current environment mode
 */
export function getAppEnvironment(): AppEnvironment {
  const viteMode = import.meta.env.MODE;
  const viteAppEnv = import.meta.env.VITE_APP_ENV;

  // Priority: VITE_APP_ENV > MODE
  if (viteAppEnv === 'production') {
    return 'production';
  }

  if (viteAppEnv === 'preview') {
    return 'preview';
  }

  if (viteMode === 'production') {
    return 'production';
  }

  return 'development';
}

/**
 * Check if the app is running in development mode
 */
export function isDevelopment(): boolean {
  return getAppEnvironment() === 'development';
}

/**
 * Check if the app is running in production mode
 */
export function isProduction(): boolean {
  return getAppEnvironment() === 'production';
}

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
 * Feature flags for SimPilot application
 */
export interface FeatureFlags {
  /** Enable MS365/SharePoint integration (requires env vars) */
  msIntegrationEnabled: boolean;
  /** Enable SimBridge external integration */
  simBridgeEnabled: boolean;
  /** Show development diagnostics panel */
  devDiagnosticsEnabled: boolean;
}

/**
 * Get current feature flags based on environment configuration
 *
 * @returns Feature flags object
 */
export function getFeatureFlags(): FeatureFlags {
  const msClientId = import.meta.env.VITE_MSAL_CLIENT_ID;
  const simBridgeUrl = import.meta.env.VITE_SIMBRIDGE_URL;

  return {
    msIntegrationEnabled: typeof msClientId === 'string' && msClientId.length > 0,
    simBridgeEnabled: typeof simBridgeUrl === 'string' && simBridgeUrl.length > 0,
    devDiagnosticsEnabled: isDevelopment(),
  };
}

/**
 * Full application configuration
 */
export interface AppConfig {
  /** Data root directory path */
  dataRoot: string;
  /** Current environment */
  environment: AppEnvironment;
  /** Feature flags */
  features: FeatureFlags;
}

/**
 * Get complete application configuration
 *
 * @returns Configuration object with all settings
 */
export function getAppConfig(): AppConfig {
  return {
    dataRoot: getDefaultDataRoot(),
    environment: getAppEnvironment(),
    features: getFeatureFlags(),
  };
}
