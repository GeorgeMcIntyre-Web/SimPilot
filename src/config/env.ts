/// <reference types="vite/client" />

export interface AppEnvConfig {
    appEnv: 'local' | 'preview' | 'production'
    msClientId?: string
    msTenantId?: string
    msRedirectUri?: string
    msSharePointSiteId?: string
    msSharePointDriveId?: string
    msSharePointRootPath?: string
}

let envConfigInstance: AppEnvConfig | undefined

export function getEnvConfig(): AppEnvConfig {
    if (envConfigInstance) {
        return envConfigInstance
    }

    const rawEnv = import.meta.env.VITE_APP_ENV
    let appEnv: AppEnvConfig['appEnv'] = 'local'

    if (rawEnv === 'production') {
        appEnv = 'production'
    } else if (rawEnv === 'preview') {
        appEnv = 'preview'
    }

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
        msSharePointRootPath
    }

    return envConfigInstance
}

export const envConfig = getEnvConfig()
