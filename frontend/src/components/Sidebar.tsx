import { useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
    LayoutDashboard,
    Wrench,
    FolderKanban,
    Users,
    Package,
    DollarSign,
    Settings,
    ChevronDown,
    ClipboardCheck,
    UserCog,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'SITE_ENGINEER' | 'ACCOUNTANT' | 'STORE_OFFICER'

interface SubItem {
    label: string
    path: string
}

interface MenuItem {
    label: string
    icon: React.ReactNode
    path?: string
    children?: SubItem[]
    /** Roles that can see this item. Omit = all roles. */
    roles?: Role[]
}

const menuItems: MenuItem[] = [
    {
        label: 'Dashboard',
        icon: <LayoutDashboard size={20} />,
        path: '/dashboard',
        // all roles see dashboard
    },
    {
        label: 'Equipment',
        icon: <Wrench size={20} />,
        path: '/equipment',
        roles: ['ADMIN', 'PROJECT_MANAGER'],
    },
    {
        label: 'Projects',
        icon: <FolderKanban size={20} />,
        children: [
            { label: 'Project Management', path: '/projects' },
            { label: 'Gantt & Milestones', path: '/projects/gantt-milestones' },
        ],
        roles: ['ADMIN', 'PROJECT_MANAGER', 'SITE_ENGINEER'],
    },
    {
        label: 'Attendance',
        icon: <ClipboardCheck size={20} />,
        path: '/attendance',
        roles: ['ADMIN', 'PROJECT_MANAGER', 'SITE_ENGINEER'],
    },
    {
        label: 'Vendors',
        icon: <Users size={20} />,
        children: [
            { label: 'Manage Contractors', path: '/vendors/contractors' },
        ],
        roles: ['ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT', 'STORE_OFFICER'],
    },
    {
        label: 'Inventory',
        icon: <Package size={20} />,
        children: [
            { label: 'Stock Levels', path: '/inventory/stock-levels' },
            { label: 'Material Requests', path: '/inventory/material-requests' },
        ],
        roles: ['ADMIN', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'STORE_OFFICER'],
    },
    {
        label: 'Finance',
        icon: <DollarSign size={20} />,
        children: [
            { label: 'Budget Tracker', path: '/finance/budget-tracker' },
            { label: 'Cash Flow', path: '/finance/cash-flow' },
            { label: 'Profitability', path: '/finance/profitability' },
            { label: 'Overrun Alerts', path: '/finance/overrun-alerts' },
        ],
        roles: ['ADMIN', 'PROJECT_MANAGER', 'ACCOUNTANT'],
    },
    {
        label: 'Registry',
        icon: <UserCog size={20} />,
        path: '/registry',
        roles: ['ADMIN'],
    },
    {
        label: 'Settings',
        icon: <Settings size={20} />,
        path: '/settings',
        // all roles see settings
    },
]

function canSeeMenuItem(item: MenuItem, role: string | undefined): boolean {
    if (!item.roles || item.roles.length === 0) return true
    if (!role) return false // hide role-restricted items when role unknown
    return item.roles.includes(role as Role)
}

export default function Sidebar() {
    const { user } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})

    const visibleMenuItems = useMemo(
        () => menuItems.filter((item) => canSeeMenuItem(item, user?.role)),
        [user?.role]
    )

    const isActive = (path?: string) => path ? location.pathname === path : false
    const isChildActive = (children?: SubItem[]) =>
        children?.some((c) => location.pathname === c.path) ?? false

    const toggleExpand = (label: string) => {
        setExpanded((prev) => ({ ...prev, [label]: !prev[label] }))
    }

    const handleClick = (item: MenuItem) => {
        if (item.children) {
            toggleExpand(item.label)
        } else if (item.path) {
            navigate(item.path)
        }
    }

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-logo">
                <img src="/Logo.png" alt="" className="sidebar-logo-img" />
                <div className="sidebar-logo-text">
                    <h1>Silverline</h1>
                    <span>Admin Dashboard</span>
                </div>
            </div>

            {/* Menu Label */}
            <div className="sidebar-menu-label">Main Menu</div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {visibleMenuItems.map((item) => {
                    const active = isActive(item.path) || isChildActive(item.children)
                    const isOpen = expanded[item.label] || isChildActive(item.children)

                    return (
                        <div key={item.label}>
                            <div
                                className={`sidebar-item ${active ? 'active' : ''}`}
                                onClick={() => handleClick(item)}
                            >
                                <span className="sidebar-item-icon">{item.icon}</span>
                                <span>{item.label}</span>
                                {item.children && (
                                    <ChevronDown
                                        className={`sidebar-item-chevron ${isOpen ? 'open' : ''}`}
                                        size={16}
                                    />
                                )}
                            </div>

                            {/* Sub-menu */}
                            {item.children && (
                                <div className={`sidebar-submenu ${isOpen ? 'open' : ''}`}>
                                    {item.children.map((child) => (
                                        <div
                                            key={child.path}
                                            className={`sidebar-subitem ${location.pathname === child.path ? 'active' : ''}`}
                                            onClick={() => navigate(child.path)}
                                        >
                                            {child.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </nav>
        </aside>
    )
}
