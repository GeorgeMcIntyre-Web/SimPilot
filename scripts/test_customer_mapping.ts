import { deriveCustomerFromFileName, getCustomerFromIdentifier } from '../src/ingestion/customerMapping';

console.log('🧪 Testing Customer Mapping\n');
console.log('='.repeat(60));

const testFiles = [
  'STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx',
  'STLA-S_UNDERBODY_Simulation_Status_DES.xlsx',
  'Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx',
  'GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx',
  'STLA-S_ZAR Tool List.xlsx',
  'P1MX_Reuse Equipment -STLA-S_2025_10_29_REV00.xlsm'
];

console.log('\n📄 Testing file name parsing:');
testFiles.forEach(fileName => {
  const customer = deriveCustomerFromFileName(fileName);
  console.log(`  ${fileName.substring(0, 40).padEnd(40)} → Customer: ${customer}`);
});

console.log('\n🔍 Testing identifier mapping:');
const testIdentifiers = ['STLA-S', 'STLAS', 'STLA', 'UNKNOWN-PROJECT', 'TMS'];
testIdentifiers.forEach(id => {
  const customer = getCustomerFromIdentifier(id);
  console.log(`  ${id.padEnd(20)} → Customer: ${customer}`);
});

console.log('\n✅ Customer mapping test complete!');


