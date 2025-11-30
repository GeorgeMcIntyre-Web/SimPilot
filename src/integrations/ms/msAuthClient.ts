import { PublicClientApplication, AccountInfo } from '@azure/msal-browser'
import { getMsConfig } from './msConfig'

export interface MsAuthState {
    enabled: boolean
    isSignedIn: boolean
    account: AccountInfo | undefined
}

let msalInstance: PublicClientApplication | undefined

async function getMsalInstance(): Promise<PublicClientApplication | undefined> {
    const config = getMsConfig()
    if (!config.enabled) return undefined

    if (!msalInstance) {
        msalInstance = new PublicClientApplication({
            auth: {
                clientId: config.clientId,
                authority: `https://login.microsoftonline.com/${config.tenantId}`,
                redirectUri: config.redirectUri,
            },
            cache: {
                cacheLocation: 'sessionStorage',
                storeAuthStateInCookie: false,
            },
        })
        await msalInstance.initialize()
    }
    return msalInstance
}

export function getMsAuthState(): MsAuthState {
    const config = getMsConfig()
    if (!config.enabled) {
        return { enabled: false, isSignedIn: false, account: undefined }
    }

    // This is a synchronous check, but msalInstance might not be initialized yet.
    // However, for the initial state in the provider, we can check if we have an active account if initialized.
    // Since initialization is async, the provider will handle the async initialization.
    // But for this helper, we'll return a safe default and let the provider sync up.
    // Actually, the provider calls this. If msalInstance isn't ready, we can't know the account.
    // We'll rely on the provider to initialize and then update state.
    // For now, return what we know.

    if (!msalInstance) {
        return { enabled: true, isSignedIn: false, account: undefined }
    }

    const accounts = msalInstance.getAllAccounts()
    const account = accounts.length > 0 ? accounts[0] : undefined

    return {
        enabled: true,
        isSignedIn: !!account,
        account,
    }
}

export async function loginWithMicrosoft(): Promise<MsAuthState> {
    const config = getMsConfig()
    if (!config.enabled) {
        return { enabled: false, isSignedIn: false, account: undefined }
    }

    const msal = await getMsalInstance()
    if (!msal) {
        return { enabled: false, isSignedIn: false, account: undefined }
    }

    try {
        const response = await msal.loginPopup({
            scopes: ['Files.Read.All', 'Sites.Read.All', 'User.Read'],
        })

        msal.setActiveAccount(response.account)

        return {
            enabled: true,
            isSignedIn: true,
            account: response.account,
        }
    } catch (error) {
        console.error('MSAL Login failed:', error)
        // Return current state (likely not signed in)
        const accounts = msal.getAllAccounts()
        return {
            enabled: true,
            isSignedIn: accounts.length > 0,
            account: accounts[0],
        }
    }
}

export async function logoutFromMicrosoft(): Promise<void> {
    const config = getMsConfig()
    if (!config.enabled) return

    const msal = await getMsalInstance()
    if (!msal) return

    await msal.logoutPopup()
}

export async function acquireMsGraphToken(scopes: string[] = ['Files.Read.All', 'Sites.Read.All']): Promise<string | undefined> {
    const config = getMsConfig()
    if (!config.enabled) return undefined

    const msal = await getMsalInstance()
    if (!msal) return undefined

    const account = msal.getActiveAccount() || msal.getAllAccounts()[0]
    if (!account) return undefined

    try {
        const response = await msal.acquireTokenSilent({
            scopes,
            account,
        })
        return response.accessToken
    } catch (error) {
        console.warn('Silent token acquisition failed, trying popup', error)
        try {
            const response = await msal.acquireTokenPopup({
                scopes,
                account,
            })
            return response.accessToken
        } catch (popupError) {
            console.error('Popup token acquisition failed', popupError)
            return undefined
        }
    }
}
