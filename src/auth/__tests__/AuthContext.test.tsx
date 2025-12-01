/**
 * AuthContext Tests
 * Tests for authentication context and session management.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { AuthProvider, AuthContext } from '../AuthContext'
import { useContext, ReactNode } from 'react'
import { AuthUser, AuthContextValue } from '../AuthTypes'

// Mock the Google OAuth library
vi.mock('@react-oauth/google', () => ({
    GoogleOAuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    useGoogleLogin: () => vi.fn()
}))

// Mock the googleConfig
vi.mock('../googleConfig', () => ({
    getGoogleClientId: () => 'test-client-id'
}))

// Helper component to access context
function AuthConsumer({ onContextReady }: { onContextReady: (ctx: AuthContextValue | undefined) => void }) {
    const ctx = useContext(AuthContext)
    onContextReady(ctx)
    return null
}

// Create a valid mock user
const createMockUser = (overrides: Partial<AuthUser> = {}): AuthUser => ({
    name: 'Test User',
    email: 'test@example.com',
    picture: 'https://example.com/photo.jpg',
    provider: 'google',
    rawIdToken: 'mock-token',
    expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
    ...overrides
})

describe('AuthContext', () => {
    beforeEach(() => {
        // Clear sessionStorage before each test
        sessionStorage.clear()
        vi.clearAllMocks()
    })

    afterEach(() => {
        sessionStorage.clear()
    })

    describe('initial state', () => {
        it('should have null user when no session exists', async () => {
            let contextValue: AuthContextValue | undefined

            await act(async () => {
                render(
                    <AuthProvider>
                        <AuthConsumer onContextReady={(ctx) => { contextValue = ctx }} />
                    </AuthProvider>
                )
            })

            expect(contextValue).toBeDefined()
            expect(contextValue!.user).toBeNull()
            expect(contextValue!.isAuthenticated).toBe(false)
        })

        it('should start with isLoading true then become false', async () => {
            const states: boolean[] = []

            function LoadingTracker() {
                const ctx = useContext(AuthContext)
                if (ctx) {
                    states.push(ctx.isLoading)
                }
                return null
            }

            await act(async () => {
                render(
                    <AuthProvider>
                        <LoadingTracker />
                    </AuthProvider>
                )
            })

            // After hydration, isLoading should be false
            expect(states[states.length - 1]).toBe(false)
        })
    })

    describe('session storage', () => {
        it('should restore valid session from storage', async () => {
            const mockUser = createMockUser()
            sessionStorage.setItem('simpilot.auth.google', JSON.stringify(mockUser))

            let contextValue: AuthContextValue | undefined

            await act(async () => {
                render(
                    <AuthProvider>
                        <AuthConsumer onContextReady={(ctx) => { contextValue = ctx }} />
                    </AuthProvider>
                )
            })

            expect(contextValue!.user).toEqual(mockUser)
            expect(contextValue!.isAuthenticated).toBe(true)
        })

        it('should clear expired session from storage', async () => {
            const expiredUser = createMockUser({
                expiresAt: Date.now() - 1000 // Expired 1 second ago
            })
            sessionStorage.setItem('simpilot.auth.google', JSON.stringify(expiredUser))

            let contextValue: AuthContextValue | undefined

            await act(async () => {
                render(
                    <AuthProvider>
                        <AuthConsumer onContextReady={(ctx) => { contextValue = ctx }} />
                    </AuthProvider>
                )
            })

            expect(contextValue!.user).toBeNull()
            expect(contextValue!.isAuthenticated).toBe(false)
            expect(sessionStorage.getItem('simpilot.auth.google')).toBeNull()
        })

        it('should handle corrupted session data gracefully', async () => {
            sessionStorage.setItem('simpilot.auth.google', 'not-valid-json')

            let contextValue: AuthContextValue | undefined

            await act(async () => {
                render(
                    <AuthProvider>
                        <AuthConsumer onContextReady={(ctx) => { contextValue = ctx }} />
                    </AuthProvider>
                )
            })

            expect(contextValue!.user).toBeNull()
            expect(contextValue!.isAuthenticated).toBe(false)
            expect(sessionStorage.getItem('simpilot.auth.google')).toBeNull()
        })
    })

    describe('logout', () => {
        it('should clear user and session on logout', async () => {
            const mockUser = createMockUser()
            sessionStorage.setItem('simpilot.auth.google', JSON.stringify(mockUser))

            let contextValue: AuthContextValue | undefined

            await act(async () => {
                render(
                    <AuthProvider>
                        <AuthConsumer onContextReady={(ctx) => { contextValue = ctx }} />
                    </AuthProvider>
                )
            })

            // Verify user is logged in
            expect(contextValue!.user).toEqual(mockUser)

            // Logout
            await act(async () => {
                contextValue!.logout()
            })

            expect(contextValue!.user).toBeNull()
            expect(contextValue!.isAuthenticated).toBe(false)
            expect(sessionStorage.getItem('simpilot.auth.google')).toBeNull()
        })
    })

    describe('isAuthenticated', () => {
        it('should return false when user is null', async () => {
            let contextValue: AuthContextValue | undefined

            await act(async () => {
                render(
                    <AuthProvider>
                        <AuthConsumer onContextReady={(ctx) => { contextValue = ctx }} />
                    </AuthProvider>
                )
            })

            expect(contextValue!.isAuthenticated).toBe(false)
        })

        it('should return true when user exists and token not expired', async () => {
            const mockUser = createMockUser()
            sessionStorage.setItem('simpilot.auth.google', JSON.stringify(mockUser))

            let contextValue: AuthContextValue | undefined

            await act(async () => {
                render(
                    <AuthProvider>
                        <AuthConsumer onContextReady={(ctx) => { contextValue = ctx }} />
                    </AuthProvider>
                )
            })

            expect(contextValue!.isAuthenticated).toBe(true)
        })
    })

    describe('context availability', () => {
        it('should provide context value to children', async () => {
            let contextValue: AuthContextValue | undefined

            await act(async () => {
                render(
                    <AuthProvider>
                        <AuthConsumer onContextReady={(ctx) => { contextValue = ctx }} />
                    </AuthProvider>
                )
            })

            expect(contextValue).toBeDefined()
            expect(typeof contextValue!.login).toBe('function')
            expect(typeof contextValue!.logout).toBe('function')
        })
    })
})
