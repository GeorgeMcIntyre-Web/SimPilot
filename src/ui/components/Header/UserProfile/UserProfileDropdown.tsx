import { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogOut, User, Settings, Palette } from 'lucide-react';
import { useTheme } from '../../../ThemeContext';
import { FlowerAccent } from '../../FlowerAccent';

interface UserProfileDropdownProps {
    name: string;
    email?: string;
    avatarUrl?: string;
    provider: 'google' | 'microsoft';
    onLogout: () => void;
}

export function UserProfileDropdown({
    name,
    email,
    avatarUrl,
    provider,
    onLogout,
}: UserProfileDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { themeMode, setThemeMode } = useTheme();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const providerBadgeColor = provider === 'google'
        ? 'bg-blue-500'
        : 'bg-orange-500';

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                title={`${name}${email ? ` (${email})` : ''}`}
            >
                <div className="relative">
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={name}
                            className="w-7 h-7 rounded-full border-2 border-gray-200 dark:border-gray-600"
                        />
                    ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
                            {name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div
                        className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ${providerBadgeColor} border-2 border-white dark:border-gray-800`}
                        title={provider === 'google' ? 'Google Account' : 'Microsoft Account'}
                    />
                </div>

                <ChevronDown
                    className={`w-3.5 h-3.5 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    {/* User Info Section */}
                    <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-2">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={name}
                                    className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-600"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                                    {name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                                    {name}
                                </p>
                                {email && (
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                        {email}
                                    </p>
                                )}
                                <p className="text-[10px] text-gray-400 dark:text-gray-500">
                                    {provider === 'google' ? 'Google' : 'Microsoft'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-0.5">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                // Could navigate to profile page
                            }}
                            className="w-full flex items-center px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <User className="w-3.5 h-3.5 mr-2" />
                            View Profile
                        </button>

                        <button
                            onClick={() => {
                                setIsOpen(false);
                                // Could navigate to settings page
                            }}
                            className="w-full flex items-center px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Settings className="w-3.5 h-3.5 mr-2" />
                            Settings
                        </button>

                        <button
                            onClick={() => {
                                setThemeMode(themeMode === 'flower' ? 'standard' : 'flower');
                            }}
                            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <div className="flex items-center">
                                {themeMode === 'flower' ? (
                                    <FlowerAccent className="w-3.5 h-3.5 mr-2 text-rose-500" />
                                ) : (
                                    <Palette className="w-3.5 h-3.5 mr-2" />
                                )}
                                Theme
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                {themeMode === 'flower' ? "Dale's Flow" : 'Standard'}
                            </span>
                        </button>
                    </div>

                    {/* Logout Section */}
                    <div className="border-t border-gray-200 dark:border-gray-700 py-0.5">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                onLogout();
                            }}
                            className="w-full flex items-center px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <LogOut className="w-3.5 h-3.5 mr-2" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
