import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LayoutShell } from '../ui/components/LayoutShell'
import { DashboardPage } from './routes/DashboardPage'
import { ProjectsPage } from './routes/ProjectsPage'
import { ProjectsByCustomerPage } from './routes/ProjectsByCustomerPage'
import { ProjectDetailPage } from './routes/ProjectDetailPage'
import { CellDetailPage } from './routes/CellDetailPage'
import { ToolsPage } from './routes/ToolsPage'
import { AssetsPage } from './routes/AssetsPage'
import { DataLoaderPage } from './routes/DataLoaderPage'
import { EngineersPage } from './routes/EngineersPage'
import { DaleConsole } from './routes/DaleConsole'
import { WarningsPage } from './routes/WarningsPage'
import { ChangesPage } from './routes/ChangesPage'
import { ReadinessBoard } from './routes/ReadinessBoard'
import { TimelineView } from './routes/TimelineView'
import { SimulationPage } from './routes/SimulationPage'
import { DataHealthPage } from './routes/DataHealthPage'
import { MsAuthProvider } from '../integrations/ms/useMsAccount'
import { GlobalBusyProvider } from '../ui/GlobalBusyContext'
import { DevDiagnostics } from '../ui/DevDiagnostics'
import { PersistenceManager } from '../persistence/PersistenceManager'
import { AuthGate } from '../auth'

import { ThemeProvider } from '../ui/ThemeContext'

function App() {
    return (
        <AuthGate>
            <MsAuthProvider>
                <GlobalBusyProvider>
                    <ThemeProvider>
                        <PersistenceManager />
                        <BrowserRouter>
                            <Routes>
                                <Route path="/" element={<LayoutShell />}>
                                    <Route index element={<Navigate to="/dashboard" replace />} />
                                    <Route path="dashboard" element={<DashboardPage />} />
                                    <Route path="simulation" element={<SimulationPage />} />
                                    <Route path="dale-console" element={<DaleConsole />} />
                                    <Route path="warnings" element={<WarningsPage />} />
                                    <Route path="projects" element={<ProjectsPage />} />
                                    <Route path="projects-by-customer" element={<ProjectsByCustomerPage />} />
                                    <Route path="projects/:projectId" element={<ProjectDetailPage />} />
                                    <Route path="projects/:projectId/cells/:cellId" element={<CellDetailPage />} />
                                    <Route path="cells/:cellId" element={<CellDetailPage />} />
                                    <Route path="engineers" element={<EngineersPage />} />
                                    <Route path="tools" element={<ToolsPage />} />
                                    <Route path="assets" element={<AssetsPage />} />
                                    <Route path="data-loader" element={<DataLoaderPage />} />
                                    <Route path="changes" element={<ChangesPage />} />
                                    <Route path="readiness" element={<ReadinessBoard />} />
                                    <Route path="timeline/:projectId" element={<TimelineView />} />
                                    <Route path="data-health" element={<DataHealthPage />} />
                                </Route>
                            </Routes>
                            <DevDiagnostics />
                        </BrowserRouter>
                    </ThemeProvider>
                </GlobalBusyProvider>
            </MsAuthProvider>
        </AuthGate>
    )
}

export default App
