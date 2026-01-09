# Strikethrough Detection Limitation

## Issue

The `xlsx` (SheetJS) library does not support reading font-level formatting like strikethrough when parsing Excel files, even with the `cellStyles: true` option. This option only reads:
- Cell fill patterns
- Cell borders
- Number formats
- Cell alignment

**Font formatting is NOT supported**, including:
- Strikethrough
- Bold
- Italic
- Font color
- Underline

## Current Status

The Robot Equipment List ingestion system includes:
- ✅ `isRemoved` field in the data model
- ✅ UI checkbox filter for "Show Removed (Struck-through)"
- ✅ Visual styling for removed robots (gray border, opacity, struck-through text)
- ❌ **Automatic detection of struck-through cells** - NOT WORKING due to library limitation

## Workarounds

### Option 1: Manual Flag Column (Recommended)
Add a column in the Excel file (e.g., "Status" or "Removed") with values like "Active" / "Removed". Parse this column instead of relying on cell formatting.

**Implementation**:
```typescript
// In robotEquipmentListParser.ts
const isRemoved = normalizeString(row['Status']) === 'Removed'
entity.isRemoved = isRemoved
```

### Option 2: Use ExcelJS Library
ExcelJS supports reading rich cell formatting including strikethrough.

**Installation**:
```bash
npm install exceljs
```

**Implementation**:
```typescript
import * as ExcelJS from 'exceljs'

const workbook = new ExcelJS.Workbook()
await workbook.xlsx.readFile(filePath)

const worksheet = workbook.getWorksheet('V801N_Robot_Equipment_List 26.9')

worksheet.eachRow((row, rowNumber) => {
  const robotIdCell = row.getCell(10)  // Column J (1-indexed)

  if (robotIdCell.font && robotIdCell.font.strike) {
    console.log(`Row ${rowNumber}: ${robotIdCell.value} is struck through`)
  }
})
```

### Option 3: Parse Raw XLSX XML
Extract and parse the raw XML from the XLSX file to read font formatting.

This is complex and not recommended unless absolutely necessary.

### Option 4: Pre-processing Script
Create a separate script that:
1. Reads the Excel file with ExcelJS
2. Detects struck-through robots
3. Exports a CSV/JSON file with an "isRemoved" flag
4. Ingest the CSV/JSON instead of the raw XLSX

## Recommendation

**Use Option 1 (Manual Flag Column)** for simplicity and reliability. Add a "Status" column to the Excel file and set values to "Active" or "Removed" for each robot.

If this is not feasible, **use Option 2 (ExcelJS)** which properly supports font formatting.

## Implementation with ExcelJS

If you want to implement proper strikethrough detection, here's the approach:

1. **Install ExcelJS**:
   ```bash
   npm install exceljs @types/exceljs
   ```

2. **Update ingestion to use ExcelJS**:
   ```typescript
   import * as ExcelJS from 'exceljs'

   const workbook = new ExcelJS.Workbook()
   await workbook.xlsx.readFile(filePath)

   const worksheet = workbook.getWorksheet(sheetName)

   // After creating entities, detect strikethrough
   for (const entity of entities) {
     const row = worksheet.getRow(entity.source.row + 1)  // +1 for 1-based indexing
     const robotIdCell = row.getCell(10)  // Column J

     if (robotIdCell.font?.strike) {
       entity.isRemoved = true
     }
   }
   ```

3. **Note**: ExcelJS is async, so the ingestion function would need to be async as well.

## Current Behavior

Without proper strikethrough detection:
- All robots have `isRemoved: false`
- The UI filter "Show Removed (Struck-through)" won't filter anything
- Users can manually use other filters (ESOW concerns, install status, etc.)

The system is fully functional except for automatic struck-through detection.
