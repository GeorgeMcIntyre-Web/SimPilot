/**
 * Authentication Context using Google Identity Services
 * Provides authentication state and methods via React Context.
 */

import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import { createContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { getGoogleClientId, isGoogleAuthConfigured } from './googleConfig'
import { AuthContextValue, AuthUser } from './AuthTypes'
import { log } from '../lib/log'

const STORAGE_KEY = 'simpilot.auth.google'

/** Create the context with undefined default */
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

/** Check if a user session is still valid */
const isSessionValid = (user: AuthUser | null): boolean => {
    if (!user) return false
    return user.expiresAt > Date.now()
}

/** Load user from session storage */
const loadUserFromStorage = (): AuthUser | null => {
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY)
        if (!stored) return null

        const user = JSON.parse(stored) as AuthUser
        if (!isSessionValid(user)) {
            sessionStorage.removeItem(STORAGE_KEY)
            return null
        }
        return user
    } catch {
        sessionStorage.removeItem(STORAGE_KEY)
        return null
    }
}

/** Save user to session storage */
const saveUserToStorage = (user: AuthUser): void => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

/** Clear user from session storage */
const clearUserFromStorage = (): void => {
    sessionStorage.removeItem(STORAGE_KEY)
}

type AuthProviderInnerProps = {
    children: ReactNode
}

/**
 * Inner provider component that uses the Google OAuth hooks.
 * Must be rendered inside GoogleOAuthProvider.
 */
function AuthProviderInner({ children }: AuthProviderInnerProps) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<Error | undefined>(undefined)
    const [loginInProgress, setLoginInProgress] = useState(false)

    // Hydrate from session storage on mount
    useEffect(() => {
        const storedUser = loadUserFromStorage()
        setUser(storedUser)
        setIsLoading(false)
    }, [])

    // Handle successful login - receives access token, need to get ID token
    const handleLoginSuccess = useCallback(async (tokenResponse: { access_token: string }) => {
        try {
            // Fetch user info using the access token
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
            })
            
            if (!userInfoResponse.ok) {
                throw new Error('Failed to fetch user info')
            }
            
            const userInfo = await userInfoResponse.json() as { name?: string; email?: string; picture?: string }
            
            // Since implicit flow gives access_token (not id_token), we create a synthetic expiry
            // Access tokens typically last 1 hour
            const expiresAt = Date.now() + 60 * 60 * 1000
            
            const authUser: AuthUser = {
                name: userInfo.name,
                email: userInfo.email,
                picture: userInfo.picture,
                provider: 'google',
                rawIdToken: tokenResponse.access_token, // Store access token as the raw token
                expiresAt
            }
            
            setUser(authUser)
            saveUserToStorage(authUser)
            setError(undefined)
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Login failed'))
        } finally {
            setLoginInProgress(false)
        }
    }, [])

    const handleLoginError = useCallback(() => {
        setError(new Error('Google login failed'))
        setLoginInProgress(false)
    }, [])

    const googleLogin = useGoogleLogin({
        onSuccess: handleLoginSuccess,
        onError: handleLoginError,
        scope: 'openid email profile'
    })

    const login = useCallback(() => {
        if (loginInProgress) return
        setLoginInProgress(true)
        setError(undefined)
        googleLogin()
    }, [googleLogin, loginInProgress])

    const logout = useCallback(() => {
        setUser(null)
        clearUserFromStorage()
        setError(undefined)
    }, [])

    const isAuthenticated = isSessionValid(user)

    const contextValue = useMemo<AuthContextValue>(() => ({
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout
    }), [user, isAuthenticated, isLoading, error, login, logout])

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    )
}

type AuthProviderProps = {
    children: ReactNode
}

/**
 * Mock auth provider for development when Google OAuth is not configured.
 * Allows the app to run without authentication.
 */
function MockAuthProvider({ children }: AuthProviderProps) {
    const mockUser: AuthUser = {
        name: 'Development User',
        email: 'dev@localhost',
        picture: undefined,
        provider: 'mock',
        rawIdToken: 'mock-token',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    }

    const mockContextValue: AuthContextValue = {
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        error: undefined,
        login: () => {
            log.warn('Mock auth: login called but auth is disabled')
        },
        logout: () => {
            log.warn('Mock auth: logout called but auth is disabled')
        }
    }

    // Save mock user to storage for consistency
    useEffect(() => {
        saveUserToStorage(mockUser)
    }, [])

    return (
        <AuthContext.Provider value={mockContextValue}>
            {children}
        </AuthContext.Provider>
    )
}

/**
 * Top-level authentication provider.
 * Wraps the app with GoogleOAuthProvider and the inner auth context.
 * Falls back to mock auth if Google OAuth is not configured.
 */
export function AuthProvider({ children }: AuthProviderProps) {
    const isConfigured = isGoogleAuthConfigured()

    if (!isConfigured) {
        log.warn('Google OAuth not configured. Running in development mode without authentication.')
        return <MockAuthProvider>{children}</MockAuthProvider>
    }

    const clientId = getGoogleClientId()

    return (
        <GoogleOAuthProvider clientId={clientId}>
            <AuthProviderInner>{children}</AuthProviderInner>
        </GoogleOAuthProvider>
    )
}
