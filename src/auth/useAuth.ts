/**
 * useAuth Hook
 * Provides access to authentication state and methods.
 */

import { useContext } from 'react'
import { AuthContextValue } from './AuthTypes'
import { AuthContext } from './AuthContext'

/**
 * Hook to access authentication state and methods.
 * Must be used within an AuthProvider.
 *
 * @returns AuthContextValue containing user, isAuthenticated, login, logout, etc.
 * @throws Error if used outside of AuthProvider
 */
export const useAuth = (): AuthContextValue => {
    const ctx = useContext(AuthContext)
    if (!ctx) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return ctx
}
