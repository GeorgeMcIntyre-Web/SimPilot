import { FlowerAccent } from '../FlowerAccent';

export function AppLogo() {
    return (
        <div className="flex items-center">
            <FlowerAccent className="w-6 h-6 text-rose-400 mr-2 hover:rotate-12 transition-transform duration-300" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-emerald-600">
                SimPilot
            </span>
        </div>
    );
}
