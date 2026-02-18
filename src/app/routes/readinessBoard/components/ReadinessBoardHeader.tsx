import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export function ReadinessBoardHeader() {
  return (
    <div className="flex flex-col gap-4">
      <nav className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
        <Link to="/dashboard" className="hover:text-indigo-600 transition-colors">
          SimPilot
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-gray-900 dark:text-gray-200">Readiness Board</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none uppercase">
            Readiness <span className="text-indigo-600 dark:text-indigo-400">Board</span>
          </h1>
        </div>
      </div>
    </div>
  )
}
