import { User } from '../domain/types'
import { getUserById } from '../domain/usersStore'

// Mocking a logged-in user for MVP
const CURRENT_USER_ID = 'u1' // Alex Manager

export function useCurrentUser(): User | undefined {
    return getUserById(CURRENT_USER_ID)
}
