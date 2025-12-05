interface GoogleUser {
    name?: string;
    email?: string;
    picture?: string;
}

interface MobileGoogleProfileProps {
    user: GoogleUser;
    onLogout: () => void;
    onClose: () => void;
}

export function MobileGoogleProfile({ user, onLogout, onClose }: MobileGoogleProfileProps) {
    return (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 pb-3">
            <div className="px-4 space-y-1">
                <div className="flex items-center space-x-3">
                    {user.picture && (
                        <img
                            src={user.picture}
                            alt={user.name || 'User'}
                            className="w-8 h-8 rounded-full border-2 border-rose-200 dark:border-rose-700"
                        />
                    )}
                    <div>
                        <div className="text-base font-medium text-gray-800 dark:text-gray-200">
                            {user.name || 'User'}
                        </div>
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {user.email}
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => {
                        onLogout();
                        onClose();
                    }}
                    className="block w-full text-left mt-2 text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                    Sign out
                </button>
            </div>
        </div>
    );
}
