import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './auth'
import App from './app/App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { coreStore } from './domain/coreStore'
import { isDevelopment } from './config/simpilotConfig'
import './index.css'

// Expose coreStore to window for browser console access (development only)
if (typeof window !== 'undefined' && isDevelopment()) {
    (window as unknown as { coreStore: typeof coreStore }).coreStore = coreStore
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <AuthProvider>
                <App />
            </AuthProvider>
        </ErrorBoundary>
    </React.StrictMode>,
)
