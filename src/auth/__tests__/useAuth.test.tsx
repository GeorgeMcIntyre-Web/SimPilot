/**
 * useAuth Hook Tests
 * Tests for the useAuth hook.
 */

// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAuth } from '../useAuth'
import { AuthContext } from '../AuthContext'
import { AuthContextValue } from '../AuthTypes'
import { ReactNode } from 'react'

describe('useAuth', () => {
    it('should throw error when used outside AuthProvider', () => {
        // Suppress console.error for this test since we expect an error
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        expect(() => {
            renderHook(() => useAuth())
        }).toThrow('useAuth must be used within AuthProvider')

        consoleSpy.mockRestore()
    })

    it('should return context value when used within AuthProvider', () => {
        const mockContext: AuthContextValue = {
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: undefined,
            login: vi.fn(),
            logout: vi.fn()
        }

        const wrapper = ({ children }: { children: ReactNode }) => (
            <AuthContext.Provider value={mockContext}>
                {children}
            </AuthContext.Provider>
        )

        const { result } = renderHook(() => useAuth(), { wrapper })

        expect(result.current).toBe(mockContext)
        expect(result.current.isAuthenticated).toBe(false)
        expect(result.current.user).toBeNull()
    })

    it('should return authenticated user when available', () => {
        const mockContext: AuthContextValue = {
            user: {
                name: 'Test User',
                email: 'test@example.com',
                provider: 'google',
                rawIdToken: 'mock-token',
                expiresAt: Date.now() + 60000
            },
            isAuthenticated: true,
            isLoading: false,
            error: undefined,
            login: vi.fn(),
            logout: vi.fn()
        }

        const wrapper = ({ children }: { children: ReactNode }) => (
            <AuthContext.Provider value={mockContext}>
                {children}
            </AuthContext.Provider>
        )

        const { result } = renderHook(() => useAuth(), { wrapper })

        expect(result.current.isAuthenticated).toBe(true)
        expect(result.current.user?.name).toBe('Test User')
        expect(result.current.user?.email).toBe('test@example.com')
    })
})
