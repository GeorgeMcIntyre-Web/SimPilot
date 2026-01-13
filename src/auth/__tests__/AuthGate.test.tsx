/**
 * AuthGate Tests
 * Tests for the authentication gate component.
 */

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

import { AuthGate } from '../AuthGate'
import { AuthContext } from '../AuthContext'
import { AuthContextValue, AuthUser } from '../AuthTypes'
import { ReactNode } from 'react'

// Mock the FlowerAccent component
vi.mock('../../ui/components/FlowerAccent', () => ({
    FlowerAccent: ({ className }: { className?: string }) => (
        <span data-testid="flower-accent" className={className}>🌸</span>
    )
}))

// Helper to create a mock context value
const createMockContext = (overrides: Partial<AuthContextValue> = {}): AuthContextValue => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: undefined,
    login: vi.fn(),
    logout: vi.fn(),
    ...overrides
})

// Wrapper component to provide mock context
function MockAuthProvider({
    children,
    value
}: {
    children: ReactNode
    value: AuthContextValue
}) {
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

describe('AuthGate', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        cleanup()
        document.body.innerHTML = ''
        vi.clearAllMocks()
    })

    describe('loading state', () => {
        it('should render loading screen when isLoading is true', () => {
            const mockContext = createMockContext({ isLoading: true })

            render(
                <MockAuthProvider value={mockContext}>
                    <AuthGate>
                        <div data-testid="protected-content">Protected Content</div>
                    </AuthGate>
                </MockAuthProvider>
            )

            expect(screen.getByText('Loading...')).toBeInTheDocument()
            expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
        })
    })

    describe('unauthenticated state', () => {
        it('should render sign-in screen when not authenticated', () => {
            const mockContext = createMockContext({
                isLoading: false,
                isAuthenticated: false
            })

            render(
                <MockAuthProvider value={mockContext}>
                    <AuthGate>
                        <div data-testid="protected-content">Protected Content</div>
                    </AuthGate>
                </MockAuthProvider>
            )

            expect(screen.getByText('SimPilot')).toBeInTheDocument()
            expect(screen.getByText('Sign in with Google to continue')).toBeInTheDocument()
            expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
            expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
        })

        it('should call login when sign-in button is clicked', () => {
            const loginFn = vi.fn()
            const mockContext = createMockContext({
                isLoading: false,
                isAuthenticated: false,
                login: loginFn
            })

            render(
                <MockAuthProvider value={mockContext}>
                    <AuthGate>
                        <div>Protected Content</div>
                    </AuthGate>
                </MockAuthProvider>
            )

            fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }))

            expect(loginFn).toHaveBeenCalledTimes(1)
        })

        it('should display error message when error exists', () => {
            const mockContext = createMockContext({
                isLoading: false,
                isAuthenticated: false,
                error: new Error('Authentication failed')
            })

            render(
                <MockAuthProvider value={mockContext}>
                    <AuthGate>
                        <div>Protected Content</div>
                    </AuthGate>
                </MockAuthProvider>
            )

            expect(screen.getByText('Authentication failed')).toBeInTheDocument()
        })
    })

    describe('authenticated state', () => {
        it('should render children when authenticated', () => {
            const mockUser: AuthUser = {
                name: 'Test User',
                email: 'test@example.com',
                picture: 'https://example.com/photo.jpg',
                provider: 'google',
                rawIdToken: 'mock-token',
                expiresAt: Date.now() + 60 * 60 * 1000
            }

            const mockContext = createMockContext({
                isLoading: false,
                isAuthenticated: true,
                user: mockUser
            })

            render(
                <MockAuthProvider value={mockContext}>
                    <AuthGate>
                        <div data-testid="protected-content">Protected Content</div>
                    </AuthGate>
                </MockAuthProvider>
            )

            expect(screen.getByTestId('protected-content')).toBeInTheDocument()
            expect(screen.getByText('Protected Content')).toBeInTheDocument()
            expect(screen.queryByText('Sign in with Google to continue')).not.toBeInTheDocument()
            expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
        })
    })

    describe('state transitions', () => {
        it('should prioritize loading state over unauthenticated', () => {
            const mockContext = createMockContext({
                isLoading: true,
                isAuthenticated: false
            })

            render(
                <MockAuthProvider value={mockContext}>
                    <AuthGate>
                        <div data-testid="protected-content">Protected Content</div>
                    </AuthGate>
                </MockAuthProvider>
            )

            expect(screen.getByText('Loading...')).toBeInTheDocument()
            expect(screen.queryByText('Sign in with Google')).not.toBeInTheDocument()
        })
    })
})
