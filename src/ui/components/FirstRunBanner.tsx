import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { useHasSimulationData } from '../hooks/useDomainData';
import { getUserPreference, setUserPreference } from '../../utils/prefsStorage';

export function FirstRunBanner() {
    const hasData = useHasSimulationData();
    const [isVisible, setIsVisible] = useState(() => !getUserPreference('simpilot.firstRunBannerDismissed', false));

    if (hasData || !isVisible) return null;

    const handleDismiss = () => {
        setIsVisible(false);
        setUserPreference('simpilot.firstRunBannerDismissed', true);
    };

    return (
        <div
            data-testid="first-run-banner"
            className={`
            relative rounded-lg p-6 mb-8 shadow-sm border animate-fade-in
            bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700
        `}>
            <button
                onClick={handleDismiss}
                data-testid="first-run-banner-dismiss"
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Dismiss banner"
            >
                <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left space-y-4 md:space-y-0 md:space-x-6">
                <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Welcome to SimPilot.
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl">
                        Load a demo scenario or drop your latest status Excel to get started.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start space-y-3 sm:space-y-0 sm:space-x-4">
                        <Link
                            to="/data-loader"
                            className={`
                                inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors
                                bg-blue-600 hover:bg-blue-700 focus:ring-blue-500
                            `}
                        >
                            Load Demo Scenario
                        </Link>
                        <button
                            onClick={handleDismiss}
                            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
