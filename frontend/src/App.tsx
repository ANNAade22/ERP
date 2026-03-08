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
import CashFlow from './pages/finance/CashFlow'
import Profitability from './pages/finance/Profitability'
import OverrunAlerts from './pages/finance/OverrunAlerts'
import Settings from './pages/Settings'
import Attendance from './pages/Attendance'
import Registry from './pages/Registry'
import Login from './pages/Login'
import { useAuth } from './context/AuthContext'

export type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'SITE_ENGINEER' | 'ACCOUNTANT' | 'STORE_OFFICER'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, isAuthReady } = useAuth();
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

/** Restricts access by role. allowedRoles = undefined means all roles. */
const RoleProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: Role[] }) => {
    const { user, isAuthReady } = useAuth();
    if (!isAuthReady) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg, #f8fafc)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Loading…</span>
            </div>
        );
    }
    if (!allowedRoles || allowedRoles.length === 0) return <>{children}</>;
    const userRole = user?.role as Role | undefined;
    if (!userRole || !allowedRoles.includes(userRole)) {
        return <Navigate to="/dashboard" replace state={{ message: 'You do not have permission to access this page.' }} />;
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
                <Route path="equipment" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'PROJECT_MANAGER']}><Equipment /></RoleProtectedRoute>} />
                <Route path="projects" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'PROJECT_MANAGER', 'SITE_ENGINEER']}><Projects /></RoleProtectedRoute>} />
                <Route path="projects/gantt-milestones" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'PROJECT_MANAGER', 'SITE_ENGINEER']}><GanttMilestones /></RoleProtectedRoute>} />
                <Route path="projects/:id" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'PROJECT_MANAGER', 'SITE_ENGINEER']}><ProjectDetail /></RoleProtectedRoute>} />
                <Route path="vendors/contractors" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT', 'STORE_OFFICER']}><ManageContractors /></RoleProtectedRoute>} />
                <Route path="inventory/stock-levels" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'STORE_OFFICER']}><StockLevels /></RoleProtectedRoute>} />
                <Route path="inventory/material-requests" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'STORE_OFFICER']}><MaterialRequests /></RoleProtectedRoute>} />
                <Route path="finance/budget-tracker" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT']}><BudgetTracker /></RoleProtectedRoute>} />
                <Route path="finance/cash-flow" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT']}><CashFlow /></RoleProtectedRoute>} />
                <Route path="finance/profitability" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT']}><Profitability /></RoleProtectedRoute>} />
                <Route path="finance/overrun-alerts" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT']}><OverrunAlerts /></RoleProtectedRoute>} />
                <Route path="attendance" element={<RoleProtectedRoute allowedRoles={['ADMIN', 'PROJECT_MANAGER', 'SITE_ENGINEER']}><Attendance /></RoleProtectedRoute>} />
                <Route path="registry" element={<RoleProtectedRoute allowedRoles={['ADMIN']}><Registry /></RoleProtectedRoute>} />
                <Route path="settings" element={<Settings />} />
            </Route>
        </Routes>
        </>
    )
}

export default App
