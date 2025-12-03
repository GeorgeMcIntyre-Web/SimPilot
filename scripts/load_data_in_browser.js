/**
 * Browser Console Script to Load Exported Store Data
 * 
 * Instructions:
 * 1. Open SimPilot in browser (http://localhost:5173)
 * 2. Open DevTools (F12) → Console tab
 * 3. Copy and paste this entire script
 * 4. The data will be loaded from exported_store_data.json
 */

(async function loadStoreDataInBrowser() {
    console.log('🚀 Loading store data from exported_store_data.json...');
    
    try {
        // Fetch the exported JSON file
        const response = await fetch('/exported_store_data.json');
        
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        
        const snapshot = await response.json();
        
        console.log('✅ Snapshot loaded:', {
            projects: snapshot.projects?.length || 0,
            areas: snapshot.areas?.length || 0,
            cells: snapshot.cells?.length || 0,
            assets: snapshot.assets?.length || 0,
            meta: snapshot.meta
        });
        
        // Load snapshot into store
        if (window.coreStore && typeof window.coreStore.loadSnapshot === 'function') {
            window.coreStore.loadSnapshot(snapshot);
            console.log('✅ Data loaded into store!');
            console.log('💡 Refresh the page to see the data in the UI');
        } else {
            console.error('❌ coreStore not found on window. Make sure the app is loaded.');
            console.log('💡 Try: window.coreStore.loadSnapshot(' + JSON.stringify(snapshot).substring(0, 100) + '...)');
        }
    } catch (error) {
        console.error('❌ Error loading data:', error);
        console.log('💡 Alternative: Load the file manually:');
        console.log('   1. Open exported_store_data.json in a text editor');
        console.log('   2. Copy the entire JSON');
        console.log('   3. In console, run: window.coreStore.loadSnapshot(<paste JSON here>)');
    }
})();


