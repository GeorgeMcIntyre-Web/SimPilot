import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { getUserPreference, setUserPreference } from '../../utils/prefsStorage';

export function DaleDashboardIntro() {
    const [isVisible, setIsVisible] = useState(() => !getUserPreference('simpilot.dale.hasSeenDashboardIntro', false));

    if (!isVisible) return null;

    const handleDismiss = () => {
        setIsVisible(false);
        setUserPreference('simpilot.dale.hasSeenDashboardIntro', true);
    };

    return (
        <div
            data-testid="dale-dashboard-intro"
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 mb-8 relative animate-fade-in shadow-sm max-w-3xl mx-auto"
        >
            <button
                onClick={handleDismiss}
                data-testid="dale-dashboard-intro-dismiss"
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Dismiss welcome message"
            >
                <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left space-y-4 sm:space-y-0 sm:space-x-5">
                <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-full flex items-center justify-center shadow-sm font-semibold">
                        SP
                    </div>
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Hi Dale 🌸, this is your simulation cockpit.
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed">
                        Start by loading a sample day via the Data Loader, or point it at your real Excel sheets.
                    </p>
                    <div className="flex items-center justify-center sm:justify-start space-x-4">
                        <Link
                            to="/data-loader"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                            Go to Data Loader
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
