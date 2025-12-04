import { Menu } from 'lucide-react';

interface MobileMenuButtonProps {
    onClick: () => void;
}

export function MobileMenuButton({ onClick }: MobileMenuButtonProps) {
    return (
        <div className="-mr-2 flex items-center sm:hidden ml-2">
            <button
                onClick={onClick}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
                <span className="sr-only">Open main menu</span>
                <Menu className="block h-6 w-6" />
            </button>
        </div>
    );
}
