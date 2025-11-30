import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LayoutShell } from '../ui/components/LayoutShell'
import { DashboardPage } from './routes/DashboardPage'
import { ProjectsPage } from './routes/ProjectsPage'
import { ProjectDetailPage } from './routes/ProjectDetailPage'
import { CellDetailPage } from './routes/CellDetailPage'
import { ToolsPage } from './routes/ToolsPage'
import { DataLoaderPage } from './routes/DataLoaderPage'
import { EngineersPage } from './routes/EngineersPage'
import { DaleConsole } from './routes/DaleConsole'
import { WarningsPage } from './routes/WarningsPage'
import { ChangesPage } from './routes/ChangesPage'
import { ReadinessBoard } from './routes/ReadinessBoard'
import { TimelineView } from './routes/TimelineView'
import { MsAuthProvider } from '../integrations/ms/useMsAccount'
import { GlobalBusyProvider } from '../ui/GlobalBusyContext'
import { DevDiagnostics } from '../ui/DevDiagnostics'
import { PersistenceManager } from '../persistence/PersistenceManager'

function App() {
    return (
        <MsAuthProvider>
            <GlobalBusyProvider>
                <PersistenceManager />
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<LayoutShell />}>
                            <Route index element={<Navigate to="/dashboard" replace />} />
                            <Route path="dashboard" element={<DashboardPage />} />
                            <Route path="dale-console" element={<DaleConsole />} />
                            <Route path="warnings" element={<WarningsPage />} />
                            <Route path="projects" element={<ProjectsPage />} />
                            <Route path="projects/:projectId" element={<ProjectDetailPage />} />
                            <Route path="projects/:projectId/cells/:cellId" element={<CellDetailPage />} />
                            <Route path="cells/:cellId" element={<CellDetailPage />} />
                            <Route path="engineers" element={<EngineersPage />} />
                            <Route path="tools" element={<ToolsPage />} />
                            <Route path="data-loader" element={<DataLoaderPage />} />
                            <Route path="changes" element={<ChangesPage />} />
                            <Route path="readiness" element={<ReadinessBoard />} />
                            <Route path="timeline/:projectId" element={<TimelineView />} />
                        </Route>
                    </Routes>
                    <DevDiagnostics />
                </BrowserRouter>
            </GlobalBusyProvider>
        </MsAuthProvider>
    )
}

export default App
