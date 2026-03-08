import { useEffect } from 'react'
import { useLocation, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { isPathAllowedForRole } from '../utils/routePermissions'

/**
 * Wraps the app content and redirects to /dashboard with an "Access denied" toast
 * when the user navigates to a path their role cannot access.
 */
export default function RoleGuard({ children }: { children: React.ReactNode }) {
    const location = useLocation()
    const { user } = useAuth()
    const pathname = location.pathname

    const allowed = isPathAllowedForRole(pathname, user?.role)

    useEffect(() => {
        if (!allowed) {
            toast.error('You don\'t have access to this page.')
        }
    }, [allowed])

    if (!allowed) {
        return <Navigate to="/dashboard" replace state={{ from: pathname }} />
    }

    return <>{children}</>
}
