import React from 'react'
import ReactDOM from 'react-dom/client'
import { AuthProvider } from './auth'
import App from './app/App'
import { coreStore } from './domain/coreStore'
import './index.css'

// Expose coreStore to window for browser console access (development only)
if (typeof window !== 'undefined') {
    (window as any).coreStore = coreStore
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AuthProvider>
            <App />
        </AuthProvider>
    </React.StrictMode>,
)
