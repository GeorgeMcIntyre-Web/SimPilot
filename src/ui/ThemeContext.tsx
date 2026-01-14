import React, { createContext, useContext, useEffect, useState } from 'react';
import { setUserPreference } from '../utils/prefsStorage';

export type ThemeMode = 'professional';

interface ThemeContextType {
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [themeMode, setThemeModeState] = useState<ThemeMode>('professional');

    useEffect(() => {
        setUserPreference('themeMode', themeMode);
    }, [themeMode]);

    const setThemeMode = (mode: ThemeMode) => {
        // Only professional mode is supported; keep state stable.
        setThemeModeState('professional');
    };

    return (
        <ThemeContext.Provider value={{ themeMode, setThemeMode }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
