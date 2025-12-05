import { UserProfileDropdown } from './UserProfileDropdown';

interface MicrosoftAccount {
    name?: string;
    username?: string;
}

interface MicrosoftUserProfileProps {
    isSignedIn: boolean;
    account: MicrosoftAccount | null | undefined;
    onLogin: () => void;
    onLogout: () => void;
}

export function MicrosoftUserProfile({
    isSignedIn,
    account,
    onLogin,
    onLogout,
}: MicrosoftUserProfileProps) {
    return (
        <div className="hidden sm:flex items-center border-l border-gray-200 dark:border-gray-700 pl-4">
            {!isSignedIn ? (
                <button
                    onClick={onLogin}
                    className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                    Sign in with Microsoft
                </button>
            ) : (
                <UserProfileDropdown
                    name={account?.name || account?.username || 'User'}
                    email={account?.username}
                    provider="microsoft"
                    onLogout={onLogout}
                />
            )}
        </div>
    );
}
