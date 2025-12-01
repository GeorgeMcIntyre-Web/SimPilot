import { FlowerAccent } from './FlowerAccent';
import { X } from 'lucide-react';

interface DaleWelcomeStripProps {
    onDismiss: () => void;
}

export function DaleWelcomeStrip({ onDismiss }: DaleWelcomeStripProps) {
    return (
        <div className="bg-gradient-to-r from-rose-50 to-indigo-50 dark:from-rose-900/20 dark:to-indigo-900/20 border border-rose-100 dark:border-rose-800 rounded-lg p-4 mb-6 relative animate-fade-in shadow-sm">
            <button
                onClick={onDismiss}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label="Dismiss welcome message"
            >
                <X className="h-4 w-4" />
            </button>

            <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                    <FlowerAccent className="h-8 w-8 text-rose-400 animate-pulse" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        Welcome to your SimPilot cockpit 🌸
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-3 text-sm leading-relaxed">
                        I’ll show you where things are red, who’s overloaded, and what to worry about first.
                        This is your calm space to manage the chaos.
                    </p>
                    <button
                        onClick={onDismiss}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-rose-500 hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-colors"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}
