import { envConfig } from '../../config/env'

export interface MsConfig {
    enabled: boolean
    clientId: string
    tenantId: string
    redirectUri: string
    sharePointSiteId: string
    sharePointDriveId: string
    sharePointRootPath: string
}

export function getMsConfig(): MsConfig {
    const {
        msClientId,
        msTenantId,
        msRedirectUri,
        msSharePointSiteId,
        msSharePointDriveId,
        msSharePointRootPath
    } = envConfig

    if (!msClientId || !msTenantId) {
        return {
            enabled: false,
            clientId: '',
            tenantId: '',
            redirectUri: '',
            sharePointSiteId: '',
            sharePointDriveId: '',
            sharePointRootPath: '',
        }
    }

    return {
        enabled: true,
        clientId: msClientId,
        tenantId: msTenantId,
        redirectUri: msRedirectUri || 'http://localhost:5173',
        sharePointSiteId: msSharePointSiteId || '',
        sharePointDriveId: msSharePointDriveId || '',
        sharePointRootPath: msSharePointRootPath || '/Shared Documents/',
    }
}
