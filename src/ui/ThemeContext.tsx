import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserPreference, setUserPreference } from '../utils/prefsStorage';

export type ThemeMode = 'standard' | 'flower' | 'professional';

interface ThemeContextType {
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [themeMode, setThemeModeState] = useState<ThemeMode>(() =>
        getUserPreference<ThemeMode>('themeMode', 'flower')
    );

    useEffect(() => {
        setUserPreference('themeMode', themeMode);

        // Update body class for global styling if needed
        if (themeMode === 'flower') {
            document.body.classList.add('theme-flower');
        } else {
            document.body.classList.remove('theme-flower');
        }
    }, [themeMode]);

    const setThemeMode = (mode: ThemeMode) => {
        setThemeModeState(mode);
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
