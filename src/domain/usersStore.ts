import { User } from './types'
import { users } from './mockData'

export function getUsers(): User[] {
    if (users.length === 0) return []
    return users
}

export function getUserById(id: string): User | undefined {
    if (!id) return
    const user = users.find(u => u.id === id)
    if (!user) return
    return user
}

export function getSimulationEngineers(): User[] {
    return users.filter(u => u.role === 'SIM_ENGINEER')
}
