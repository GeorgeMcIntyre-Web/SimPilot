import { getMsConfig } from './msConfig'
import { acquireMsGraphToken } from './msAuthClient'
import { log } from '../../lib/log'

export interface MsDriveItem {
  id: string
  name: string
  webUrl: string
  isFolder: boolean
  lastModifiedDateTime?: string
}

export type MsExcelFileItem = MsDriveItem

export async function listExcelFilesInConfiguredFolder(): Promise<MsExcelFileItem[]> {
  const config = getMsConfig()
  if (!config.enabled) return []

  const token = await acquireMsGraphToken()
  if (!token) return []

  const { sharePointSiteId, sharePointDriveId, sharePointRootPath } = config

  // Construct path. Ensure it starts/ends correctly if needed.
  // Graph API format: /drives/{drive-id}/root:/{path-relative-to-root}:/children
  // If path is just "/", it might be /root/children

  let url = `https://graph.microsoft.com/v1.0/sites/${sharePointSiteId}/drives/${sharePointDriveId}/root/children`

  if (sharePointRootPath && sharePointRootPath !== '/') {
    // Remove leading/trailing slashes for cleaner interpolation if needed,
    // but Graph expects :/path:/ format.
    const cleanPath = sharePointRootPath.replace(/^\/+|\/+$/g, '')
    url = `https://graph.microsoft.com/v1.0/sites/${sharePointSiteId}/drives/${sharePointDriveId}/root:/${cleanPath}:/children`
  }

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      log.error('Graph API error', response.statusText)
      return []
    }

    const data = await response.json()
    const items: any[] = data.value || []

    return items
      .filter((item) => {
        // Filter out folders
        if (item.folder) return false
        // Filter for Excel files
        const name = item.name.toLowerCase()
        return name.endsWith('.xlsx') || name.endsWith('.xlsm')
      })
      .map((item) => ({
        id: item.id,
        name: item.name,
        webUrl: item.webUrl,
        isFolder: !!item.folder,
        lastModifiedDateTime: item.lastModifiedDateTime,
      }))
  } catch (error) {
    log.error('Failed to list files', error)
    return []
  }
}

export async function downloadFileAsBlob(itemId: string): Promise<Blob | undefined> {
  const config = getMsConfig()
  if (!config.enabled) return undefined

  const token = await acquireMsGraphToken()
  if (!token) return undefined

  const { sharePointSiteId, sharePointDriveId } = config
  const url = `https://graph.microsoft.com/v1.0/sites/${sharePointSiteId}/drives/${sharePointDriveId}/items/${itemId}/content`

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      log.error('Graph download error', response.statusText)
      return undefined
    }

    return await response.blob()
  } catch (error) {
    log.error('Failed to download file', error)
    return undefined
  }
}

export function blobToFile(blob: Blob, name: string): File {
  return new File([blob], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    lastModified: Date.now(),
  })
}
