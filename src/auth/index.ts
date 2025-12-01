/**
 * Auth Module Exports
 * Re-exports all authentication-related types and components.
 */

export { AuthProvider, AuthContext } from './AuthContext'
export { useAuth } from './useAuth'
export { AuthGate } from './AuthGate'
export { getGoogleClientId, isGoogleAuthConfigured } from './googleConfig'
export type { AuthUser, AuthContextValue, AuthProviderId } from './AuthTypes'
