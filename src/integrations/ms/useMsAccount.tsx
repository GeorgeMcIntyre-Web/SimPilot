import { AccountInfo } from '@azure/msal-browser'
import React, { createContext, useContext, useEffect, useState } from 'react'
import {
    getMsAuthState,
    initializeMsAuth,
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
        // Initialize MSAL and get auth state properly
        // This ensures MSAL is initialized before checking for accounts
        const init = async () => {
            try {
                // Use the proper async initialization function
                // This will initialize MSAL if needed and check for existing accounts
                const initialState = await initializeMsAuth()
                setState(initialState)
            } catch (error) {
                console.error('Failed to initialize MSAL:', error)
                // Fallback to synchronous check if async init fails
                setState(getMsAuthState())
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
