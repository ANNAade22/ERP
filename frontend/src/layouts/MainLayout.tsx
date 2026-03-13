import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import RoleGuard from '../components/RoleGuard'

export default function MainLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    return (
        <div className="app-layout" data-sidebar-collapsed={sidebarCollapsed ? '' : undefined}>
            <Sidebar collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed((c) => !c)} />
            <div className="main-area">
                <Header />
                <main className="main-content">
                    <RoleGuard>
                        <Outlet />
                    </RoleGuard>
                </main>
            </div>
        </div>
    )
}
