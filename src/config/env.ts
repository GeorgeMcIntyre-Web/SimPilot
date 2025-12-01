/// <reference types="vite/client" />

export interface AppEnvConfig {
    appEnv: 'local' | 'preview' | 'production'
    msClientId?: string
    msTenantId?: string
    msRedirectUri?: string
    msSharePointSiteId?: string
    msSharePointDriveId?: string
    msSharePointRootPath?: string
    simBridgeUrl?: string
}

let envConfigInstance: AppEnvConfig | undefined

function resolveAppEnv(rawEnv: string | undefined): AppEnvConfig['appEnv'] {
    if (rawEnv === 'production') {
        return 'production'
    }
    if (rawEnv === 'preview') {
        return 'preview'
    }
    return 'local'
}

export function getEnvConfig(): AppEnvConfig {
    if (envConfigInstance) {
        return envConfigInstance
    }

    const appEnv = resolveAppEnv(import.meta.env.VITE_APP_ENV)

    // Optional MS Integration values
    // If these are missing, MS integration is simply disabled in msConfig.ts
    const msClientId = import.meta.env.VITE_MSAL_CLIENT_ID
    const msTenantId = import.meta.env.VITE_MSAL_TENANT_ID
    const msRedirectUri = import.meta.env.VITE_MSAL_REDIRECT_URI
    const msSharePointSiteId = import.meta.env.VITE_MSAL_SHAREPOINT_SITE_ID
    const msSharePointDriveId = import.meta.env.VITE_MSAL_SHAREPOINT_DRIVE_ID
    const msSharePointRootPath = import.meta.env.VITE_MSAL_SHAREPOINT_ROOT_PATH

    envConfigInstance = {
        appEnv,
        msClientId,
        msTenantId,
        msRedirectUri,
        msSharePointSiteId,
        msSharePointDriveId,
        msSharePointRootPath,
        simBridgeUrl: import.meta.env.VITE_SIMBRIDGE_URL
    }

    return envConfigInstance
}

export const envConfig = getEnvConfig()
