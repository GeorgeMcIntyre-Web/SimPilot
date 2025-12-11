import { useState, useCallback, useEffect } from 'react';
import { PageHeader } from '../../ui/components/PageHeader';
import { ingestFiles, IngestFilesResult, IngestFilesInput } from '../../ingestion/ingestionCoordinator';
import { Upload, AlertTriangle, CheckCircle, FileUp, RefreshCw } from 'lucide-react';
import { FlowerAccent } from '../../ui/components/FlowerAccent';
import { useDropzone } from 'react-dropzone';
import { cn } from '../../ui/lib/utils';
import { useMsAccount } from '../../integrations/ms/useMsAccount';
import { listExcelFilesInConfiguredFolder, downloadFileAsBlob, blobToFile, MsExcelFileItem } from '../../integrations/ms/msGraphClient';
import { DEMO_SCENARIOS, loadDemoScenario, DemoScenarioId, coreStore } from '../../domain/coreStore';
import { getUserPreference, setUserPreference } from '../../utils/prefsStorage';
import { useGlobalBusy } from '../../ui/GlobalBusyContext';

import { useHasSimulationData } from '../../ui/hooks/useDomainData';
import { clearCrossRefData } from '../../hooks/useCrossRefData';
import { syncSimulationStore } from '../../features/simulation';
import { simBridgeClient, SimBridgeStatus } from '../../integrations/simbridge/SimBridgeClient';
import { Radio } from 'lucide-react';
import { VersionComparisonModal } from '../components/VersionComparisonModal';
import { VersionComparisonResult } from '../../ingestion/versionComparison';

export function DataLoaderPage() {
  const [isIngesting, setIsIngesting] = useState(false)
  const [result, setResult] = useState<IngestFilesResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'local' | 'm365' | 'simbridge'>(() => getUserPreference('simpilot.dataloader.tab', 'local') as any)
  const { pushBusy, popBusy } = useGlobalBusy()
  const hasData = useHasSimulationData()

  // Version Comparison State
  const [showVersionComparison, setShowVersionComparison] = useState(false)
  const [versionComparison, setVersionComparison] = useState<VersionComparisonResult | null>(null)
  const [pendingIngestInput, setPendingIngestInput] = useState<IngestFilesInput | null>(null)

  useEffect(() => {
    setUserPreference('simpilot.dataloader.tab', activeTab)
  }, [activeTab])

  // Local State
  const [simulationFiles, setSimulationFiles] = useState<File[]>([])
  const [equipmentFiles, setEquipmentFiles] = useState<File[]>([])
  const [toolListFiles, setToolListFiles] = useState<File[]>([])
  const [assembliesFiles, setAssembliesFiles] = useState<File[]>([])
  const [showClearDialog, setShowClearDialog] = useState(false)

  // M365 State
  const { enabled: msEnabled, isSignedIn, login } = useMsAccount()
  const [m365Items, setM365Items] = useState<MsExcelFileItem[]>([])
  const [selectedSimIds, setSelectedSimIds] = useState<string[]>([])
  const [selectedEqIds, setSelectedEqIds] = useState<string[]>([])
  const [isLoadingM365, setIsLoadingM365] = useState(false)
  const [m365Error, setM365Error] = useState<string | null>(null)

  // Demo State
  const [selectedDemoId, setSelectedDemoId] = useState<DemoScenarioId>(() => getUserPreference('simpilot.dataloader.demoId', 'STLA_SAMPLE'))

  useEffect(() => {
    setUserPreference('simpilot.dataloader.demoId', selectedDemoId)
  }, [selectedDemoId])

  // SimBridge State
  const [sbStatus, setSbStatus] = useState<SimBridgeStatus>({ isConnected: false, version: '' })
  const [sbStudyPath, setSbStudyPath] = useState('')
  const [sbError, setSbError] = useState<string | null>(null)

  useEffect(() => {
    // Check status on mount if tab is active
    if (activeTab === 'simbridge') {
      checkSbStatus()
    }
  }, [activeTab])

  const checkSbStatus = async () => {
    const status = await simBridgeClient.getStatus()
    setSbStatus(status)
  }

  const handleSbConnect = async () => {
    pushBusy('Connecting to SimBridge...')
    try {
      const connected = await simBridgeClient.connect()
      if (connected) {
        await checkSbStatus()
        setSbError(null)
      } else {
        setSbError('Failed to connect to SimBridge. Ensure the server is running.')
      }
    } catch (e) {
      setSbError('Connection error.')
    } finally {
      popBusy()
    }
  }

  const handleSbLoadStudy = async () => {
    if (!sbStudyPath) return
    pushBusy('Loading study via SimBridge...')
    try {
      const success = await simBridgeClient.loadStudy(sbStudyPath)
      if (success) {
        setSbError(null)
        // Here we might want to trigger a refresh of data if SimBridge pushes data to us
        // For now, just show success
        alert('Study loaded successfully!')
      } else {
        setSbError('Failed to load study.')
      }
    } catch (e) {
      setSbError('Error loading study.')
    } finally {
      popBusy()
    }
  }

  // ============================================================================
  // LOCAL HANDLERS
  // ============================================================================

  const onDropSimulation = useCallback((acceptedFiles: File[]) => {
    console.log('Dropped simulation files:', acceptedFiles.length)
    setSimulationFiles(prev => [...prev, ...acceptedFiles])
    setResult(null)
    setError(null)
  }, [])

  const onDropEquipment = useCallback((acceptedFiles: File[]) => {
    setEquipmentFiles(prev => [...prev, ...acceptedFiles])
    setResult(null)
    setError(null)
  }, [])

  const onDropToolList = useCallback((acceptedFiles: File[]) => {
    setToolListFiles(prev => [...prev, ...acceptedFiles])
    setResult(null)
    setError(null)
  }, [])

  const onDropAssemblies = useCallback((acceptedFiles: File[]) => {
    setAssembliesFiles(prev => [...prev, ...acceptedFiles])
    setResult(null)
    setError(null)
  }, [])

  const { getRootProps: getSimProps, getInputProps: getSimInputProps, isDragActive: isSimActive } = useDropzone({
    onDrop: onDropSimulation,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.xlsm'] }
  })

  const { getRootProps: getEqProps, getInputProps: getEqInputProps, isDragActive: isEqActive } = useDropzone({
    onDrop: onDropEquipment,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.xlsm'] }
  })

  const { getRootProps: getToolProps, getInputProps: getToolInputProps, isDragActive: isToolActive } = useDropzone({
    onDrop: onDropToolList,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.xlsm'] }
  })

  const { getRootProps: getAsmProps, getInputProps: getAsmInputProps, isDragActive: isAsmActive } = useDropzone({
    onDrop: onDropAssemblies,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx', '.xlsm'] }
  })

  const handleLocalIngest = async () => {
    if (simulationFiles.length === 0) {
      setError("At least one Simulation Status file is required.")
      return
    }

    setIsIngesting(true)
    pushBusy('Ingesting local files...')
    setError(null)
    setResult(null)

    try {
      // Combine all equipment-related files into equipmentFiles array
      const allEquipmentFiles = [...equipmentFiles, ...toolListFiles, ...assembliesFiles]

      const input: IngestFilesInput = {
        simulationFiles,
        equipmentFiles: allEquipmentFiles,
        fileSources: {},
        dataSource: 'Local',
        previewOnly: hasData  // If we have existing data, do preview first
      }

      // Mark sources as local
      simulationFiles.forEach(f => { if (input.fileSources) input.fileSources[f.name] = 'local' })
      allEquipmentFiles.forEach(f => { if (input.fileSources) input.fileSources[f.name] = 'local' })

      const res = await ingestFiles(input)

      // If we have existing data and got a version comparison, show the modal
      if (hasData && res.versionComparison) {
        setVersionComparison(res.versionComparison)
        setPendingIngestInput(input)
        setShowVersionComparison(true)
      } else {
        // No existing data, just show result
        setResult(res)
      }
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "An unknown error occurred during ingestion.")
    } finally {
      setIsIngesting(false)
      popBusy()
    }
  }

  const confirmVersionComparison = async () => {
    if (!pendingIngestInput) return

    setIsIngesting(true)
    pushBusy('Applying changes...')
    setShowVersionComparison(false)

    try {
      // Now actually apply the data (previewOnly = false)
      const input = { ...pendingIngestInput, previewOnly: false }
      const res = await ingestFiles(input)
      setResult(res)
      setPendingIngestInput(null)
      setVersionComparison(null)
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : "An unknown error occurred during ingestion.")
    } finally {
      setIsIngesting(false)
      popBusy()
    }
  }

  const cancelVersionComparison = () => {
    setShowVersionComparison(false)
    setPendingIngestInput(null)
    setVersionComparison(null)
    setIsIngesting(false)
  }

  // ============================================================================
  // M365 HANDLERS
  // ============================================================================

  const refreshM365Files = async () => {
    setIsLoadingM365(true)
    pushBusy('Listing SharePoint files...')
    setM365Error(null)
    try {
      const files = await listExcelFilesInConfiguredFolder()
      if (files.length === 0) {
        setM365Error("No Excel files found in the configured SharePoint folder.")
      }
      setM365Items(files)
    } catch (e) {
      setM365Error("Failed to list files from Microsoft 365.")
    } finally {
      setIsLoadingM365(false)
      popBusy()
    }
  }

  const handleM365Ingest = async () => {
    if (selectedSimIds.length === 0 && selectedEqIds.length === 0) {
      setM365Error("Please select at least one file to load.")
      return
    }

    setIsIngesting(true)
    pushBusy('Downloading & Ingesting M365 files...')
    setM365Error(null)
    setResult(null)

    try {
      const simBlobsAsFiles: File[] = []
      const eqBlobsAsFiles: File[] = []
      const fileSources: Record<string, 'local' | 'remote'> = {}

      // Download Simulation Files
      for (const id of selectedSimIds) {
        const item = m365Items.find(i => i.id === id)
        if (item) {
          const blob = await downloadFileAsBlob(id)
          if (blob) {
            const file = blobToFile(blob, item.name)
            simBlobsAsFiles.push(file)
            fileSources[file.name] = 'remote'
          }
        }
      }

      // Download Equipment Files
      for (const id of selectedEqIds) {
        const item = m365Items.find(i => i.id === id)
        if (item) {
          const blob = await downloadFileAsBlob(id)
          if (blob) {
            const file = blobToFile(blob, item.name)
            eqBlobsAsFiles.push(file)
            fileSources[file.name] = 'remote'
          }
        }
      }

      if (simBlobsAsFiles.length === 0) {
        throw new Error("Failed to download any simulation files.")
      }

      const input: IngestFilesInput = {
        simulationFiles: simBlobsAsFiles,
        equipmentFiles: eqBlobsAsFiles,
        fileSources,
        dataSource: 'MS365',
        previewOnly: hasData  // If we have existing data, do preview first
      }

      const res = await ingestFiles(input)

      // If we have existing data and got a version comparison, show the modal
      if (hasData && res.versionComparison) {
        setVersionComparison(res.versionComparison)
        setPendingIngestInput(input)
        setShowVersionComparison(true)
      } else {
        // No existing data, just show result
        setResult(res)
      }

    } catch (err) {
      console.error(err)
      setM365Error(err instanceof Error ? err.message : "An unknown error occurred during M365 ingestion.")
    } finally {
      setIsIngesting(false)
      popBusy()
    }
  }

  const toggleM365Selection = (id: string, type: 'sim' | 'eq') => {
    if (type === 'sim') {
      if (selectedSimIds.includes(id)) {
        setSelectedSimIds(prev => prev.filter(i => i !== id))
      } else {
        setSelectedSimIds(prev => [...prev, id])
        // Ensure mutual exclusivity
        setSelectedEqIds(prev => prev.filter(i => i !== id))
      }
    } else {
      if (selectedEqIds.includes(id)) {
        setSelectedEqIds(prev => prev.filter(i => i !== id))
      } else {
        setSelectedEqIds(prev => [...prev, id])
        // Ensure mutual exclusivity
        setSelectedSimIds(prev => prev.filter(i => i !== id))
      }
    }
  }

  // ============================================================================
  // DEMO HANDLERS
  // ============================================================================

  const handleLoadDemo = () => {
    pushBusy('Loading demo scenario...')
    // Simulate a small delay for effect
    setTimeout(() => {
      loadDemoScenario(selectedDemoId)
      syncSimulationStore()

      const state = coreStore.getState()
      setResult({
        projectsCount: state.projects.length,
        areasCount: state.areas.length,
        cellsCount: state.cells.length,
        robotsCount: state.assets.filter(a => a.kind === 'ROBOT').length,
        toolsCount: state.assets.filter(a => a.kind !== 'ROBOT').length,
        warnings: []
      })

      setError(null)
      setM365Error(null)
      popBusy()
    }, 500)
  }

  const handleLoadExportedData = async () => {
    pushBusy('Loading exported data...')
    setError(null)
    setM365Error(null)
    
    try {
      const response = await fetch('/exported_store_data.json')
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.status}`)
      }
      
      const snapshot = await response.json()
      
      // Deduplicate projects, areas, and cells by ID before loading
      const deduplicatedSnapshot = {
        ...snapshot,
        projects: deduplicateById(snapshot.projects || []),
        areas: deduplicateById(snapshot.areas || []),
        cells: deduplicateById(snapshot.cells || []),
        assets: deduplicateById(snapshot.assets || [])
      }
      
      // Clear store first to avoid duplicates
      coreStore.clear()
      coreStore.loadSnapshot(deduplicatedSnapshot)
      syncSimulationStore()
      
      const state = coreStore.getState()
      // Convert string warnings to IngestionWarning format
      const warnings = (state.warnings || []).map((msg, idx) => ({
        id: `warning-${idx}`,
        kind: 'ROW_SKIPPED' as const,
        fileName: 'exported_store_data.json',
        message: msg,
        createdAt: new Date().toISOString()
      }))
      
      setResult({
        projectsCount: state.projects.length,
        areasCount: state.areas.length,
        cellsCount: state.cells.length,
        robotsCount: state.assets.filter(a => a.kind === 'ROBOT').length,
        toolsCount: state.assets.filter(a => a.kind !== 'ROBOT').length,
        warnings
      })
      
      console.log('✅ Exported data loaded (deduplicated):', {
        projects: state.projects.length,
        areas: state.areas.length,
        cells: state.cells.length,
        assets: state.assets.length
      })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load exported data'
      setError(errorMsg)
      console.error('Error loading exported data:', err)
    } finally {
      popBusy()
    }
  }

  // Helper to deduplicate arrays by ID
  const deduplicateById = <T extends { id: string }>(items: T[]): T[] => {
    const seen = new Map<string, T>()
    for (const item of items) {
      if (!seen.has(item.id)) {
        seen.set(item.id, item)
      }
    }
    return Array.from(seen.values())
  }

  const handleClearData = () => {
    setShowClearDialog(true)
  }

  const confirmClearData = () => {
    coreStore.clear()
    syncSimulationStore()
    clearCrossRefData()
    setResult(null)
    setError(null)
    setM365Error(null)
    setSimulationFiles([])
    setEquipmentFiles([])
    setToolListFiles([])
    setAssembliesFiles([])
    setShowClearDialog(false)
    console.log('✅ Data cleared')
  }

  const cancelClearData = () => {
    setShowClearDialog(false)
  }

  return (
    <div className="space-y-6" data-testid="data-loader-root">
      <PageHeader
        title="Data Loader"
        subtitle="Import simulation status and equipment lists from Excel files."
      />
      {
        !hasData && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 flex items-start space-x-3">
            <div className="flex-shrink-0">
              <span className="text-xl">💡</span>
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">New here? Try the Fast Path</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                To see SimPilot in action immediately, use the <strong>Load Demo Scenario</strong> button below (select <em>STLA_SAMPLE</em>).
                For real projects, upload your Excel status files in the "Local Files" tab.
              </p>
            </div>
          </div>
        )
      }

      {/* Demo Mode Section */}
      <div className="bg-gradient-to-r from-rose-50 to-white dark:from-gray-800 dark:to-gray-800 shadow rounded-lg p-6 border border-rose-100 dark:border-indigo-900/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center" data-testid="demo-loader">
              <FlowerAccent className="w-5 h-5 mr-2 text-rose-500" />
              <span className="mr-2">🌸</span> Quick Start: Load Demo Data
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Quickly load sample data for demonstration purposes without needing Excel files.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedDemoId}
              onChange={(e) => setSelectedDemoId(e.target.value as DemoScenarioId)}
              data-testid="demo-scenario-select"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {DEMO_SCENARIOS.map(scenario => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.label}
                </option>
              ))}
            </select>
            <button
              onClick={handleLoadDemo}
              data-testid="demo-load-button"
              data-testid-stla="load-demo-stla"
              className="inline-flex items-center justify-center px-3 py-1.5 w-32 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-colors whitespace-nowrap"
            >
              Load Demo
            </button>
            <button
              onClick={handleLoadExportedData}
              className="inline-flex items-center justify-center px-3 py-1.5 w-40 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors whitespace-nowrap"
            >
              Load Excel Data
            </button>
            <button
              onClick={handleClearData}
              className="inline-flex items-center justify-center px-3 py-1.5 w-32 border border-gray-300 dark:border-gray-600 text-xs font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors whitespace-nowrap"
            >
              Clear Data
            </button>
          </div>
        </div>
      </div>

      {/* Ingestion Section */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('local')}
              data-testid="tab-local-files"
              className={cn(
                "w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors",
                activeTab === 'local'
                  ? "border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50/30"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-rose-200 dark:text-gray-400 dark:hover:text-gray-300"
              )}
            >
              Local Files
            </button>
            {msEnabled && (
              <button
                onClick={() => setActiveTab('m365')}
                className={cn(
                  "w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors",
                  activeTab === 'm365'
                    ? "border-rose-500 text-rose-600 dark:text-rose-400 bg-rose-50/30"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-rose-200 dark:text-gray-400 dark:hover:text-gray-300"
                )}
              >
                Microsoft 365
              </button>
            )}
            <button
              onClick={() => setActiveTab('simbridge')}
              className={cn(
                "w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm",
                activeTab === 'simbridge'
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              )}
            >
              SimBridge
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* LOCAL TAB */}
          {activeTab === 'local' && (
            <div className="space-y-6">
              {/* Simulation Files Dropzone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Simulation Status Files (Required)
                </label>
                <div
                  {...getSimProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                    isSimActive ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  )}
                >
                  <input {...getSimInputProps()} data-testid="local-simulation-input" />
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Drag & drop simulation files here, or click to select
                  </p>
                </div>
                {simulationFiles.length > 0 && (
                  <ul className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {simulationFiles.map((file, idx) => (
                      <li key={idx} className="flex items-center">
                        <FileUp className="w-4 h-4 mr-2" />
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Equipment Files Dropzone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Robot Equipment List (Optional)
                </label>
                <div
                  {...getEqProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                    isEqActive ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  )}
                >
                  <input {...getEqInputProps()} data-testid="local-equipment-input" />
                  <Upload className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Robotlist_*.xlsx
                  </p>
                </div>
                {equipmentFiles.length > 0 && (
                  <ul className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {equipmentFiles.map((file, idx) => (
                      <li key={idx} className="flex items-center">
                        <FileUp className="w-4 h-4 mr-2" />
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Tool List Files Dropzone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tool List (Optional)
                </label>
                <div
                  {...getToolProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                    isToolActive ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  )}
                >
                  <input {...getToolInputProps()} data-testid="local-toollist-input" />
                  <Upload className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    STLA_S_ZAR Tool List.xlsx
                  </p>
                </div>
                {toolListFiles.length > 0 && (
                  <ul className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {toolListFiles.map((file, idx) => (
                      <li key={idx} className="flex items-center">
                        <FileUp className="w-4 h-4 mr-2" />
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Assemblies List Files Dropzone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assemblies List (Optional)
                </label>
                <div
                  {...getAsmProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                    isAsmActive ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  )}
                >
                  <input {...getAsmInputProps()} data-testid="local-assemblies-input" />
                  <Upload className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    J11006_TMS_STLA_S_*_Assemblies_List.xlsm
                  </p>
                </div>
                {assembliesFiles.length > 0 && (
                  <ul className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {assembliesFiles.map((file, idx) => (
                      <li key={idx} className="flex items-center">
                        <FileUp className="w-4 h-4 mr-2" />
                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                      <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleLocalIngest}
                  disabled={isIngesting || simulationFiles.length === 0}
                  data-testid="local-ingest-button"
                  data-testid-ingest="ingest-files-button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isIngesting ? 'Processing...' : 'Parse & Load Local Files'}
                </button>
              </div>
            </div>
          )}

          {/* M365 TAB */}
          {activeTab === 'm365' && msEnabled && (
            <div className="space-y-6">
              {!isSignedIn ? (
                <div className="text-center py-12">
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">Authentication Required</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">To pick files from SharePoint, sign in with your Microsoft account.</p>
                  <div className="mt-6">
                    <button
                      onClick={() => login()}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Sign in with Microsoft
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Select files from your configured SharePoint folder.
                    </p>
                    <button
                      onClick={refreshM365Files}
                      disabled={isLoadingM365}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                      <RefreshCw className={cn("w-4 h-4 mr-1", isLoadingM365 && "animate-spin")} />
                      Refresh Files
                    </button>
                  </div>

                  {m365Error && (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
                      <p className="text-sm text-red-700 dark:text-red-300">{m365Error}</p>
                    </div>
                  )}

                  {m365Items.length > 0 ? (
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                      <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-6">Name</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Last Modified</th>
                            <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Simulation</th>
                            <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">Equipment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                          {m365Items.map((item) => (
                            <tr key={item.id}>
                              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-100 sm:pl-6">
                                <a href={item.webUrl} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-600">
                                  {item.name}
                                </a>
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">
                                {item.lastModifiedDateTime ? new Date(item.lastModifiedDateTime).toLocaleDateString() : '-'}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedSimIds.includes(item.id)}
                                  onChange={() => toggleM365Selection(item.id, 'sim')}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedEqIds.includes(item.id)}
                                  onChange={() => toggleM365Selection(item.id, 'eq')}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    !isLoadingM365 && !m365Error && (
                      <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">
                        Click "Refresh Files" to load from SharePoint.
                      </div>
                    )
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={handleM365Ingest}
                      disabled={isIngesting || (selectedSimIds.length === 0 && selectedEqIds.length === 0)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isIngesting ? 'Downloading & Processing...' : 'Load Selected from Microsoft'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* SIMBRIDGE TAB */}
          {activeTab === 'simbridge' && (
            <div className="space-y-6 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                    <Radio className={cn("w-5 h-5 mr-2", sbStatus.isConnected ? "text-green-500" : "text-gray-400")} />
                    SimBridge Connection
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Connect to the local SimBridge server to interact with Tecnomatix.
                  </p>
                </div>
                <div>
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                    sbStatus.isConnected ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                  )}>
                    {sbStatus.isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>

              {!sbStatus.isConnected ? (
                <div className="flex justify-center py-8">
                  <button
                    onClick={handleSbConnect}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Connect to SimBridge
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Study Path (.psz)
                    </label>
                    <div className="mt-1 flex rounded-md shadow-sm">
                      <input
                        type="text"
                        value={sbStudyPath}
                        onChange={(e) => setSbStudyPath(e.target.value)}
                        placeholder="C:\Path\To\Study.psz"
                        className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      <button
                        onClick={handleSbLoadStudy}
                        disabled={!sbStudyPath}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        Load Study
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {sbError && (
                <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
                      <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                        <p>{sbError}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      {
        result && (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center" data-testid="data-loaded-indicator">
                <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Ingestion Complete</h3>
              </div>
              <button
                onClick={() => window.location.href = '/dashboard'}
                data-testid="go-to-dashboard-button"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
              >
                Go to Dashboard →
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="result-projects-count">{result.projectsCount}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Projects</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="result-areas-count">{result.areasCount}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Areas</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="result-cells-count">{result.cellsCount}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Stations</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="result-robots-count">{result.robotsCount}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Robots</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="result-tools-count">{result.toolsCount}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Tools</div>
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Warnings ({result.warnings.length})
                </h4>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-md p-4 max-h-60 overflow-y-auto">
                  <ul className="space-y-2">
                    {result.warnings.map((w, i) => (
                      <li key={i} className="text-sm text-orange-800 dark:text-orange-200">
                        <span className="font-semibold">{w.fileName}:</span> {w.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )
      }

      {/* Version Comparison Modal */}
      {showVersionComparison && versionComparison && (
        <VersionComparisonModal
          comparison={versionComparison}
          onConfirm={confirmVersionComparison}
          onCancel={cancelVersionComparison}
        />
      )}

      {/* Clear Data Confirmation Dialog */}
      {showClearDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Clear all data?</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                This will remove loaded simulation, equipment, tool list, and assemblies data. This action cannot be undone.
              </p>
            </div>
            <div className="px-6 pb-4 flex justify-end gap-3">
              <button
                onClick={cancelClearData}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearData}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-sm transition-colors"
              >
                Yes, clear data
              </button>
            </div>
          </div>
        </div>
      )}
    </div >
  )
}
