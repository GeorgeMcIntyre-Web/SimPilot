import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LayoutShell } from '../ui/components/LayoutShell'
import { MsAuthProvider } from '../integrations/ms/useMsAccount'
import { GlobalBusyProvider } from '../ui/GlobalBusyContext'
import { DevDiagnostics } from '../ui/DevDiagnostics'
import { PersistenceManager } from '../persistence/PersistenceManager'
import { AuthGate } from '../auth'
import { ThemeProvider } from '../ui/ThemeContext'
import { ErrorBoundary } from '../components/ErrorBoundary'

// Lazy load all route components for code splitting
const DashboardPage = lazy(() => import('./routes/DashboardPage'))
const ProjectsPage = lazy(() => import('./routes/ProjectsPage'))
const ProjectsByCustomerPage = lazy(() => import('./routes/ProjectsByCustomerPage'))
const ProjectDetailPage = lazy(() => import('./routes/ProjectDetailPage'))
const CellDetailPage = lazy(() => import('./routes/CellDetailPage'))
const ToolsPage = lazy(() => import('./routes/ToolsPage'))
const AssetsPage = lazy(() => import('./routes/AssetsPage'))
const DataLoaderPage = lazy(() => import('./routes/DataLoaderPage'))
const ImportHistoryPage = lazy(() => import('./routes/ImportHistoryPage'))
const EngineersPage = lazy(() => import('./routes/EngineersPage'))
const AssetDetailPage = lazy(() => import('./routes/AssetDetailPage'))
const DaleConsole = lazy(() => import('./routes/DaleConsole'))
const WarningsPage = lazy(() => import('./routes/WarningsPage'))
const ChangesPage = lazy(() => import('./routes/ChangesPage'))
const ReadinessBoard = lazy(() => import('./routes/ReadinessBoard'))
const TimelineView = lazy(() => import('./routes/TimelineView'))
const RobotSimulationPage = lazy(() => import('./routes/RobotSimulationPage'))
const RobotSimulationAspectPage = lazy(() => import('./routes/RobotSimulationAspectPage'))
const SimulationPage = lazy(() => import('./routes/SimulationPage'))
const DataHealthPage = lazy(() => import('./routes/DataHealthPage'))
const ToolingBottlenecksPage = lazy(() => import('./routes/ToolingBottlenecksPage'))
const ImportReviewPage = lazy(() => import('./routes/ImportReviewPage'))
const AmbiguityBundleImportPage = lazy(() => import('./routes/AmbiguityBundleImportPage'))
const RegistryPage = lazy(() => import('./routes/RegistryPage'))
const AuditTrailPage = lazy(() => import('./routes/AuditTrailPage'))
const VersionHistoryPage = lazy(() => import('./routes/VersionHistoryPage'))

// Loading fallback component
function RouteLoader() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
        </div>
    )
}

function App() {
    return (
        <AuthGate>
            <MsAuthProvider>
                <GlobalBusyProvider>
                    <ThemeProvider>
                        <PersistenceManager />
                        <BrowserRouter>
                            <ErrorBoundary>
                                <Suspense fallback={<RouteLoader />}>
                                    <Routes>
                                        <Route path="/" element={<LayoutShell />}>
                                            <Route index element={<Navigate to="/dashboard" replace />} />
                                            <Route path="dashboard" element={<DashboardPage />} />
                                            <Route path="robot-simulation" element={<RobotSimulationPage />} />
                                            <Route path="robot-simulation/:aspect" element={<RobotSimulationAspectPage />} />
                                            <Route path="simulation" element={<SimulationPage />} />
                                            <Route path="tooling-bottlenecks" element={<ToolingBottlenecksPage />} />
                                            <Route path="dale-console" element={<DaleConsole />} />
                                            <Route path="warnings" element={<WarningsPage />} />
                                            <Route path="projects" element={<ProjectsPage />} />
                                            <Route path="projects-by-customer" element={<ProjectsByCustomerPage />} />
                                            <Route path="projects/:projectId" element={<ProjectDetailPage />} />
                                            <Route path="projects/:projectId/cells/:cellId" element={<CellDetailPage />} />
                                            <Route path="cells/:cellId" element={<CellDetailPage />} />
                                            <Route path="engineers" element={<EngineersPage />} />
                                            <Route path="assets/:assetId" element={<AssetDetailPage />} />
                                            <Route path="tools" element={<ToolsPage />} />
                                            <Route path="assets" element={<AssetsPage />} />
                                            <Route path="data-loader" element={<DataLoaderPage />} />
                                            <Route path="import-history" element={<ImportHistoryPage />} />
                                            <Route path="changes" element={<ChangesPage />} />
                                            <Route path="readiness" element={<ReadinessBoard />} />
                                            <Route path="timeline/:projectId" element={<TimelineView />} />
                                            <Route path="data-health" element={<DataHealthPage />} />
                                            <Route path="import-history" element={<ImportHistoryPage />} />
                                            <Route path="import-review/:importRunId" element={<ImportReviewPage />} />
                                            <Route path="ambiguity-bundle-import" element={<AmbiguityBundleImportPage />} />
                                            <Route path="registry" element={<RegistryPage />} />
                                            <Route path="audit-trail" element={<AuditTrailPage />} />
                                            <Route path="version-history" element={<VersionHistoryPage />} />
                                        </Route>
                                    </Routes>
                                </Suspense>
                            </ErrorBoundary>
                            <DevDiagnostics />
                        </BrowserRouter>
                    </ThemeProvider>
                </GlobalBusyProvider>
            </MsAuthProvider>
        </AuthGate>
    )
}

export default App
