import { Link } from 'react-router-dom';
import { ArrowRight, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useDaleActions } from '../hooks/useDaleActions';
import { FlowerAccent } from './FlowerAccent';

export function DaleTodayPanel() {
    const actions = useDaleActions();

    if (actions.length === 0) return null;

    return (
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-rose-100 dark:border-rose-900/30 rounded-lg p-4 mb-6 shadow-sm animate-fade-in">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <FlowerAccent className="h-5 w-5 text-rose-400 mr-2" />
                Today's Three Moves
            </h3>
            <div className="space-y-3">
                {actions.map(action => (
                    <div
                        key={action.id}
                        className={`p-3 rounded-md border ${action.severity === 'high'
                                ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800'
                                : action.severity === 'medium'
                                    ? 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800'
                                    : 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800'
                            }`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex items-start space-x-3">
                                <div className="mt-0.5">
                                    {action.severity === 'high' && <AlertCircle className="h-5 w-5 text-rose-500" />}
                                    {action.severity === 'medium' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
                                    {action.severity === 'low' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                        {action.title}
                                    </h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                        {action.detail}
                                    </p>
                                </div>
                            </div>
                            {action.link && (
                                <Link
                                    to={action.link.to}
                                    className="flex-shrink-0 ml-4 p-1 rounded-full hover:bg-white/50 dark:hover:bg-black/20 transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    title={action.link.label}
                                >
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
