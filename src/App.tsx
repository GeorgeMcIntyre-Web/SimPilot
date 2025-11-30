import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './routes/DashboardPage'
import ProjectsPage from './routes/ProjectsPage'
import ProjectPage from './routes/ProjectPage'
import EquipmentPage from './routes/EquipmentPage'

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<AppLayout />}>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="projects" element={<ProjectsPage />} />
                    <Route path="projects/:projectId" element={<ProjectPage />} />
                    <Route path="equipment" element={<EquipmentPage />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
