/**
 * Google OAuth Configuration
 * Reads and validates the Google Client ID from environment variables.
 */

export const getGoogleClientId = (): string => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
    if (!clientId) {
        throw new Error('VITE_GOOGLE_CLIENT_ID is not set')
    }
    return clientId
}

/**
 * Check if Google OAuth is configured without throwing.
 * Useful for conditional rendering or graceful degradation.
 */
export const isGoogleAuthConfigured = (): boolean => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
    return Boolean(clientId && clientId.length > 0)
}
