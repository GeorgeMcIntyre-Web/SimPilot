import { useState } from 'react';
import { X, FileSpreadsheet, Users, AlertTriangle, LayoutDashboard } from 'lucide-react';
import { getUserPreference, setUserPreference } from '../../utils/prefsStorage';
import { FlowerAccent } from './FlowerAccent';

export function DaleValuePropPanel() {
    const [isVisible, setIsVisible] = useState(() => !getUserPreference('simpilot.dale.hasSeenValueProp', false));

    if (!isVisible) return null;

    const handleDismiss = () => {
        setIsVisible(false);
        setUserPreference('simpilot.dale.hasSeenValueProp', true);
    };

    return (
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-indigo-100 dark:border-indigo-900/30 rounded-lg p-4 mb-6 relative animate-fade-in shadow-sm">
            <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Dismiss info panel"
            >
                <X className="h-4 w-4" />
            </button>

            <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                    <FlowerAccent className="h-6 w-6 text-indigo-400" />
                </div>
                <div className="flex-1">
                    <h3 className="text-base font-medium text-gray-900 dark:text-white mb-3">
                        How SimPilot helps you 🌿
                    </h3>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <li className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                            <LayoutDashboard className="h-4 w-4 text-indigo-500 mr-2 mt-0.5" />
                            <span>Shows all projects in one place</span>
                        </li>
                        <li className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                            <AlertTriangle className="h-4 w-4 text-rose-500 mr-2 mt-0.5" />
                            <span>Highlights worst cells first</span>
                        </li>
                        <li className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                            <Users className="h-4 w-4 text-blue-500 mr-2 mt-0.5" />
                            <span>Shows who is overloaded</span>
                        </li>
                        <li className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                            <FileSpreadsheet className="h-4 w-4 text-emerald-500 mr-2 mt-0.5" />
                            <span>Keeps track of changes & exports to Excel</span>
                        </li>
                    </ul>
                    <button
                        onClick={handleDismiss}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 underline"
                    >
                        Hide this
                    </button>
                </div>
            </div>
        </div>
    );
}
