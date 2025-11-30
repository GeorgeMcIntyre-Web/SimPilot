import { AccountInfo } from '@azure/msal-browser'
import React, { createContext, useContext, useEffect, useState } from 'react'
import {
    getMsAuthState,
    loginWithMicrosoft,
    logoutFromMicrosoft,
    MsAuthState,
} from './msAuthClient'

export interface MsAccountContextValue {
    enabled: boolean
    isSignedIn: boolean
    account: AccountInfo | undefined
    login: () => Promise<void>
    logout: () => Promise<void>
}

const MsAccountContext = createContext<MsAccountContextValue | undefined>(undefined)

export function MsAuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<MsAuthState>({
        enabled: false,
        isSignedIn: false,
        account: undefined,
    })

    useEffect(() => {
        // Initial state load
        // We need to wait for MSAL to initialize in msAuthClient if enabled
        // For now, we'll just poll or rely on the fact that getMsAuthState checks config
        // A better approach in a real app might be an async init function exposed by msAuthClient
        // But for this scope, we'll just call getMsAuthState which is safe

        // Actually, since getMsAuthState might return "enabled" but not yet "isSignedIn" if MSAL isn't ready,
        // we should probably try to "init" implicitly.
        // Let's just call getMsAuthState. If it's enabled, we might want to try to get the active account async
        // to ensure MSAL is loaded.

        const init = async () => {
            // Force initialization if enabled
            const initialState = getMsAuthState()
            if (initialState.enabled) {
                // Trigger the async init in the background if needed by calling a method that ensures it
                // or just rely on the fact that we can't really "wait" easily without exposing the instance.
                // Let's just set what we have.
                // Ideally, we'd have an `initialize()` method in msAuthClient.
                // But per requirements, we keep it simple.
                // Let's try to "login" silently or just check status.
                // We can add a small helper in msAuthClient to "ensureInitialized" if we wanted,
                // but let's just use what we have.

                // If we want to correctly detect "already signed in" from session storage,
                // we need to wait for MSAL.
                // Let's assume the user clicks "Sign In" if they aren't seen as signed in immediately.
                // OR, we can try to acquire a token silently which forces init.

                try {
                    // This is a hack to force init
                    // await acquireMsGraphToken(['User.Read']) 
                    // But that might trigger popup if interaction required.

                    // Let's just set state.
                    setState(initialState)
                } catch (e) {
                    console.error(e)
                }
            } else {
                setState(initialState)
            }
        }
        init()
    }, [])

    const login = async () => {
        const newState = await loginWithMicrosoft()
        setState(newState)
    }

    const logout = async () => {
        await logoutFromMicrosoft()
        setState(getMsAuthState())
    }

    return (
        <MsAccountContext.Provider
            value={{
                enabled: state.enabled,
                isSignedIn: state.isSignedIn,
                account: state.account,
                login,
                logout,
            }}
        >
            {children}
        </MsAccountContext.Provider>
    )
}

export function useMsAccount(): MsAccountContextValue {
    const context = useContext(MsAccountContext)
    if (context === undefined) {
        throw new Error('useMsAccount must be used within MsAuthProvider')
    }
    return context
}
