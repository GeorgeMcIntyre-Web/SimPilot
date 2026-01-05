export function getUserPreference<T>(key: string, fallback: T): T {
    try {
        const item = localStorage.getItem(key)
        if (item === null) {
            return fallback
        }
        return JSON.parse(item) as T
    } catch (_e) {
        return fallback
    }
}

export function setUserPreference<T>(key: string, value: T): void {
    try {
        const str = JSON.stringify(value)
        localStorage.setItem(key, str)
    } catch (_e) {
        // Ignore errors
    }
}
