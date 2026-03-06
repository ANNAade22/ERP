import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import Equipment from './pages/Equipment'
import Projects from './pages/Projects'
import GanttMilestones from './pages/projects/GanttMilestones'
import ProjectDetail from './pages/projects/ProjectDetail'
import ManageContractors from './pages/vendors/ManageContractors'
import StockLevels from './pages/inventory/StockLevels'
import MaterialRequests from './pages/inventory/MaterialRequests'
import BudgetTracker from './pages/finance/BudgetTracker'
import Settings from './pages/Settings'
import Attendance from './pages/Attendance'
import Registry from './pages/Registry'
import Login from './pages/Login'
import { useAuth } from './context/AuthContext'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, isAuthReady } = useAuth();
    // Wait until we've read token from localStorage before redirecting (fixes logout on refresh)
    if (!isAuthReady) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg, #f8fafc)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Loading…</span>
            </div>
        );
    }
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

function App() {
    return (
        <>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="equipment" element={<Equipment />} />
                <Route path="projects" element={<Projects />} />
                <Route path="projects/gantt-milestones" element={<GanttMilestones />} />
                <Route path="projects/:id" element={<ProjectDetail />} />
                <Route path="vendors/contractors" element={<ManageContractors />} />
                <Route path="inventory/stock-levels" element={<StockLevels />} />
                <Route path="inventory/material-requests" element={<MaterialRequests />} />
                <Route path="finance/budget-tracker" element={<BudgetTracker />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="registry" element={<Registry />} />
                <Route path="settings" element={<Settings />} />
            </Route>
        </Routes>
        </>
    )
}

export default App
