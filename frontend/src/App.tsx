import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import Equipment from './pages/Equipment'
import Projects from './pages/Projects'
import ManageContractors from './pages/vendors/ManageContractors'
import StockLevels from './pages/inventory/StockLevels'
import MaterialRequests from './pages/inventory/MaterialRequests'
import BudgetTracker from './pages/finance/BudgetTracker'
import Settings from './pages/Settings'
import Login from './pages/Login'

function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<MainLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="equipment" element={<Equipment />} />
                <Route path="projects" element={<Projects />} />
                <Route path="vendors/contractors" element={<ManageContractors />} />
                <Route path="inventory/stock-levels" element={<StockLevels />} />
                <Route path="inventory/material-requests" element={<MaterialRequests />} />
                <Route path="finance/budget-tracker" element={<BudgetTracker />} />
                <Route path="settings" element={<Settings />} />
            </Route>
        </Routes>
    )
}

export default App
