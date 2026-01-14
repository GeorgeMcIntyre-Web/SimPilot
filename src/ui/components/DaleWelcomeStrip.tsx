import { X } from 'lucide-react';

interface DaleWelcomeStripProps {
    onDismiss: () => void;
}

export function DaleWelcomeStrip({ onDismiss }: DaleWelcomeStripProps) {
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6 relative animate-fade-in shadow-sm">
            <button
                onClick={onDismiss}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Dismiss welcome message"
            >
                <X className="h-4 w-4" />
            </button>

            <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1 h-8 w-8 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold flex items-center justify-center">
                    SP
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        Welcome to your SimPilot cockpit
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-3 text-sm leading-relaxed">
                        I’ll show you where things are red, who’s overloaded, and what to worry about first.
                        This is your calm space to manage the chaos.
                    </p>
                    <button
                        onClick={onDismiss}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}
