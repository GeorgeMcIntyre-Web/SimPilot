import { StoreSnapshot } from '../domain/storeSnapshot'

export interface PersistenceResult {
    success: boolean
    errorMessage?: string
}

export interface LoadResult extends PersistenceResult {
    snapshot?: StoreSnapshot
}

export interface PersistenceService {
    save(snapshot: StoreSnapshot): Promise<PersistenceResult>
    load(): Promise<LoadResult>
    clear(): Promise<PersistenceResult>
}
