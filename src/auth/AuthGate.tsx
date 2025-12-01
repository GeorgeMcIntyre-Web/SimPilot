/**
 * AuthGate Component
 * Gates the app based on authentication state.
 * Shows loading, sign-in, or children based on auth status.
 */

import { ReactNode } from 'react'
import { useAuth } from './useAuth'
import { FlowerAccent } from '../ui/components/FlowerAccent'

type AuthGateProps = {
    children: ReactNode
}

/** Loading screen shown while hydrating auth state */
function LoadingScreen() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-rose-50 to-emerald-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                    <FlowerAccent className="w-12 h-12 text-rose-400 animate-spin" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-lg">Loading...</p>
            </div>
        </div>
    )
}

type SignInScreenProps = {
    onSignIn: () => void
    error?: Error
}

/** Sign-in screen shown when not authenticated */
function SignInScreen({ onSignIn, error }: SignInScreenProps) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-rose-50 to-emerald-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            <div className="max-w-md w-full mx-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
                    {/* Logo & Title */}
                    <div className="flex items-center justify-center mb-6">
                        <FlowerAccent className="w-10 h-10 text-rose-400 mr-3" />
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-emerald-600">
                            SimPilot
                        </h1>
                    </div>

                    {/* Message */}
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        Sign in with Google to continue
                    </p>

                    {/* Error display */}
                    {error && (
                        <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">
                                {error.message}
                            </p>
                        </div>
                    )}

                    {/* Sign-in button */}
                    <button
                        type="button"
                        onClick={onSignIn}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200 text-gray-700 dark:text-gray-200 font-medium"
                    >
                        {/* Google Icon */}
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Sign in with Google
                    </button>

                    {/* Footer note */}
                    <p className="mt-8 text-xs text-gray-400 dark:text-gray-500">
                        Secure authentication powered by Google
                    </p>
                </div>
            </div>
        </div>
    )
}

/**
 * Authentication gate component.
 * Renders children only when authenticated.
 */
export function AuthGate({ children }: AuthGateProps) {
    const { isLoading, isAuthenticated, login, error } = useAuth()

    if (isLoading) return <LoadingScreen />
    if (!isAuthenticated) return <SignInScreen onSignIn={login} error={error} />

    return <>{children}</>
}
