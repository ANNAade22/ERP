import { useState } from 'react'
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
} from 'lucide-react'

interface SubItem {
    label: string
    path: string
}

interface MenuItem {
    label: string
    icon: React.ReactNode
    path?: string
    children?: SubItem[]
}

const menuItems: MenuItem[] = [
    {
        label: 'Dashboard',
        icon: <LayoutDashboard size={20} />,
        path: '/dashboard',
    },
    {
        label: 'Equipment',
        icon: <Wrench size={20} />,
        path: '/equipment',
    },
    {
        label: 'Projects',
        icon: <FolderKanban size={20} />,
        path: '/projects',
    },
    {
        label: 'Vendors',
        icon: <Users size={20} />,
        children: [
            { label: 'Manage Contractors', path: '/vendors/contractors' },
        ],
    },
    {
        label: 'Inventory',
        icon: <Package size={20} />,
        children: [
            { label: 'Stock Levels', path: '/inventory/stock-levels' },
            { label: 'Material Requests', path: '/inventory/material-requests' },
        ],
    },
    {
        label: 'Finance',
        icon: <DollarSign size={20} />,
        children: [
            { label: 'Budget Tracker', path: '/finance/budget-tracker' },
        ],
    },
    {
        label: 'Settings',
        icon: <Settings size={20} />,
        path: '/settings',
    },
]

export default function Sidebar() {
    const location = useLocation()
    const navigate = useNavigate()
    const [expanded, setExpanded] = useState<Record<string, boolean>>({})

    // Auto-expand menu if current path matches a child
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
                <div className="sidebar-logo-icon">C</div>
                <div className="sidebar-logo-text">
                    <h1>Construction ERP</h1>
                    <span>Admin Dashboard</span>
                </div>
            </div>

            {/* Menu Label */}
            <div className="sidebar-menu-label">Main Menu</div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {menuItems.map((item) => {
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
