import { useCurrentUser } from '../../hooks/useCurrentUser'

export default function TopBar() {
    const user = useCurrentUser()

    return (
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-6">
            <h2 className="text-lg font-semibold text-gray-700">
                {/* Breadcrumbs could go here */}
            </h2>
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{user?.name || 'Guest'}</div>
                    <div className="text-xs text-gray-500">{user?.role || 'VIEWER'}</div>
                </div>
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {user?.name?.charAt(0) || 'G'}
                </div>
            </div>
        </header>
    )
}
