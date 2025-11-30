import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'

export interface GlobalBusyState {
    isBusy: boolean
    label?: string
}

export interface GlobalBusyContextValue {
    state: GlobalBusyState
    pushBusy: (label?: string) => void
    popBusy: () => void
}

const GlobalBusyContext = createContext<GlobalBusyContextValue | null>(null)

export function GlobalBusyProvider({ children }: { children: React.ReactNode }) {
    const [counter, setCounter] = useState(0)
    const [label, setLabel] = useState<string | undefined>(undefined)

    const pushBusy = useCallback((newLabel?: string) => {
        setCounter((prev) => prev + 1)
        if (newLabel) {
            setLabel(newLabel)
        }
    }, [])

    const popBusy = useCallback(() => {
        setCounter((prev) => Math.max(0, prev - 1))
    }, [])

    const value = useMemo(() => ({
        state: {
            isBusy: counter > 0,
            label: counter > 0 ? label : undefined
        },
        pushBusy,
        popBusy
    }), [counter, label, pushBusy, popBusy])

    return (
        <GlobalBusyContext.Provider value={value}>
            {children}
        </GlobalBusyContext.Provider>
    )
}

export function useGlobalBusy() {
    const context = useContext(GlobalBusyContext)
    if (!context) {
        throw new Error('useGlobalBusy must be used within a GlobalBusyProvider')
    }
    return context
}
