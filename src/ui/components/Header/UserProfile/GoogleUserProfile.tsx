import { UserProfileDropdown } from './UserProfileDropdown';

interface GoogleUser {
    name?: string;
    email?: string;
    picture?: string;
}

interface GoogleUserProfileProps {
    user: GoogleUser;
    onLogout: () => void;
}

export function GoogleUserProfile({ user, onLogout }: GoogleUserProfileProps) {
    return (
        <div className="hidden sm:flex items-center border-l border-gray-200 dark:border-gray-700 pl-4">
            <UserProfileDropdown
                name={user.name || user.email || 'User'}
                email={user.email}
                avatarUrl={user.picture}
                provider="google"
                onLogout={onLogout}
            />
        </div>
    );
}
