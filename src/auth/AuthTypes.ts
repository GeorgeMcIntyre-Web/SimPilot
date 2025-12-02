/**
 * Authentication Types
 * Provider-neutral type definitions for authentication.
 * Designed to be extensible for future providers (Microsoft, Auth0, etc.)
 */

/** Supported authentication provider identifiers */
export type AuthProviderId = 'google' | 'mock'

/** Authenticated user information */
export type AuthUser = {
    /** User's display name */
    name?: string
    /** User's email address */
    email?: string
    /** URL to user's profile picture */
    picture?: string
    /** Authentication provider that was used */
    provider: AuthProviderId
    /** Raw ID token from the provider */
    rawIdToken: string
    /** Token expiration time in epoch milliseconds */
    expiresAt: number
}

/** Authentication context value exposed to consumers */
export type AuthContextValue = {
    /** Current authenticated user, or null if not authenticated */
    user: AuthUser | null
    /** Whether the user is currently authenticated (and token not expired) */
    isAuthenticated: boolean
    /** Whether authentication state is still loading (e.g., hydrating from storage) */
    isLoading: boolean
    /** Any authentication error that occurred */
    error?: Error
    /** Initiate login flow */
    login: () => void
    /** Log out the current user */
    logout: () => void
}
