import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import RoleGuard from '../components/RoleGuard'

export default function MainLayout() {
    return (
        <div className="app-layout">
            <Sidebar />
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
