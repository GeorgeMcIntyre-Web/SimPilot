// Quick script to check what's in the store after ingestion
import { coreStore } from '../src/domain/coreStore'

const state = coreStore.getState()

console.log('=== STORE COUNTS ===')
console.log('Projects:', state.projects.length)
console.log('Areas:', state.areas.length)
console.log('Cells:', state.cells.length)
console.log('Assets:', state.assets.length)
console.log('  - Robots:', state.assets.filter(a => a.kind === 'ROBOT').length)
console.log('  - Tools:', state.assets.filter(a => a.kind !== 'ROBOT').length)
console.log('')
console.log('=== PROJECT IDS ===')
state.projects.forEach(p => console.log(`  - ${p.id}: ${p.name}`))
console.log('')
console.log('=== AREA NAMES ===')
const uniqueAreas = new Set(state.areas.map(a => a.name))
console.log(`Unique areas: ${uniqueAreas.size}`)
uniqueAreas.forEach(name => console.log(`  - ${name}`))
