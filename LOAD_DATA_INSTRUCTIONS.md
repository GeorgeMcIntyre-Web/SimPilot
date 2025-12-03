# How to Load All Excel Data in Browser

## Quick Method (Recommended)

The data has already been processed and exported. To load it in your browser:

### Option 1: Automatic Load (Easiest)

1. **Open SimPilot in browser**: `http://localhost:5173`
2. **Open DevTools**: Press `F12`
3. **Go to Console tab**
4. **Paste this script**:

```javascript
(async function() {
    const response = await fetch('/exported_store_data.json');
    const snapshot = await response.json();
    window.coreStore.loadSnapshot(snapshot);
    console.log('✅ Data loaded! Refresh the page.');
})();
```

5. **Press Enter**
6. **Refresh the page** (F5) to see the data

### Option 2: Manual Load

1. Open `exported_store_data.json` in a text editor
2. Copy the entire JSON content
3. In browser console, run:
   ```javascript
   window.coreStore.loadSnapshot(<paste JSON here>)
   ```
4. Refresh the page

## What Was Loaded

- ✅ **4 Projects** (STLA-S REAR UNIT, STLA-S UNDERBODY)
- ✅ **16 Areas**
- ✅ **104 Cells**
- ✅ **344 Robots**
- ✅ **2,912 Tools/Guns**
- ✅ **Total: 3,256 Assets**

## Files Processed

1. STLA_S_ZAR Tool List.xlsx
2. STLA-S_REAR_UNIT_Simulation_Status_DES.xlsx
3. STLA-S_UNDERBODY_Simulation_Status_DES.xlsx
4. GLOBAL_ZA_REUSE_LIST_RISERS.xlsx
5. GLOBAL_ZA_REUSE_LIST_TIP_DRESSER.xlsx
6. GLOBAL_ZA_REUSE_LIST_TMS_WG.xlsx
7. P1MX_Reuse Equipment -STLA-S_2025_10_29_REV00.xlsm
8. Robotlist_ZA__STLA-S_UB_Rev05_20251126.xlsx
9. Zangenpool_TMS_Rev01_Quantity_Force_Info.xls

## Notes

- The data is saved to IndexedDB automatically after loading
- You only need to load it once - it will persist across page refreshes
- If you need to reload, just run the script again


