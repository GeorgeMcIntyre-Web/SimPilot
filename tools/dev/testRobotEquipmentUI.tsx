/**
 * Test Robot Equipment UI Component
 *
 * Loads robot equipment data and renders the UI component
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import { RobotEquipmentList } from '../../src/components/RobotEquipment'
import { robotEquipmentStore } from '../../src/domain/robotEquipmentStore'
import { ingestRobotEquipmentList } from '../../src/ingestion/robotEquipmentList/ingestRobotEquipmentList'

// Load robot equipment data
const filePath = "C:\\Users\\georgem\\source\\repos\\SimPilot_Data\\TestData\\V801\\V801_Docs\\Ford_OHAP_V801N_Robot_Equipment_List.xlsx"

console.log('Loading Robot Equipment List...')

const result = ingestRobotEquipmentList(filePath, { verbose: true })

console.log(`\n✓ Loaded ${result.entities.length} robots`)
console.log('Loading into store...')

// Load into store
robotEquipmentStore.setEntities(result.entities)

console.log('✓ Store loaded')
console.log('\nRendering UI...\n')

// Render component
function App() {
  return (
    <div style={{ padding: '20px' }}>
      <RobotEquipmentList />
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)
