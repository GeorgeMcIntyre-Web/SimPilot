interface MicrosoftAccount {
    name?: string;
    username?: string;
}

interface MobileMicrosoftProfileProps {
    isSignedIn: boolean;
    account: MicrosoftAccount | null | undefined;
    onLogin: () => void;
    onLogout: () => void;
    onClose: () => void;
}

export function MobileMicrosoftProfile({
    isSignedIn,
    account,
    onLogin,
    onLogout,
    onClose,
}: MobileMicrosoftProfileProps) {
    return (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 pb-3">
            {!isSignedIn ? (
                <button
                    onClick={() => {
                        onLogin();
                        onClose();
                    }}
                    className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    Sign in with Microsoft
                </button>
            ) : (
                <div className="px-4 space-y-1">
                    <div className="text-base font-medium text-gray-800 dark:text-gray-200">
                        {account?.name || account?.username}
                    </div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {account?.username}
                    </div>
                    <button
                        onClick={() => {
                            onLogout();
                            onClose();
                        }}
                        className="block w-full text-left mt-1 text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                        Sign out
                    </button>
                </div>
            )}
        </div>
    );
}
