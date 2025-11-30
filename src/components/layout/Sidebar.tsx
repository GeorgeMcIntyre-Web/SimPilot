import { NavLink } from 'react-router-dom'

export default function Sidebar() {
    const linkClass = ({ isActive }: { isActive: boolean }) =>
        `block px-4 py-2 rounded-md mb-1 ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`

    return (
        <aside className="w-64 bg-gray-900 text-white flex flex-col">
            <div className="p-6">
                <h1 className="text-2xl font-bold tracking-tight text-blue-400">SimPilot</h1>
                <p className="text-xs text-gray-500 mt-1">Simulation Control</p>
            </div>
            <nav className="flex-1 px-4">
                <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
                <NavLink to="/projects" className={linkClass}>Projects</NavLink>
                <NavLink to="/equipment" className={linkClass}>Equipment</NavLink>
            </nav>
            <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
                v0.1.0 MVP
            </div>
        </aside>
    )
}
