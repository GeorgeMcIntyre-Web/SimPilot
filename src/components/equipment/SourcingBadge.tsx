import { EquipmentSourcing } from '../../domain/types'
import { Recycle, ShoppingBag, Wrench, Package, HelpCircle } from 'lucide-react'

interface SourcingBadgeProps {
    sourcing?: EquipmentSourcing
}

export function SourcingBadge({ sourcing }: SourcingBadgeProps) {
    if (!sourcing || sourcing === 'UNKNOWN') {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                <HelpCircle className="w-3 h-3 mr-1" />
                Unknown
            </span>
        )
    }

    const config = {
        'REUSE': {
            color: 'bg-green-100 text-green-800',
            icon: Recycle,
            label: 'Reuse'
        },
        'NEW_BUY': {
            color: 'bg-blue-100 text-blue-800',
            icon: ShoppingBag,
            label: 'New'
        },
        'MAKE': {
            color: 'bg-purple-100 text-purple-800',
            icon: Wrench,
            label: 'Make'
        },
        'FREE_ISSUE': {
            color: 'bg-yellow-100 text-yellow-800',
            icon: Package,
            label: 'Free Issue'
        }
    }

    const { color, icon: Icon, label } = config[sourcing]

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
            <Icon className="w-3 h-3 mr-1" />
            {label}
        </span>
    )
}
