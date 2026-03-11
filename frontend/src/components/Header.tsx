import { useState, useRef, useEffect } from 'react'
import { Search, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import Avatar from './Avatar'

export default function Header() {
    const { logout, user } = useAuth()
    const navigate = useNavigate()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const displayName = (user as { name?: string })?.name ?? (user?.role === 'ADMIN' ? 'Admin' : (user?.email?.split('@')[0] || 'User'))

    const handleLogout = () => {
        setDropdownOpen(false)
        logout()
        navigate('/login')
    }

    const handleNav = (path: string) => {
        setDropdownOpen(false)
        navigate(path)
    }

    return (
        <header className="header">
            <div className="header-left">
                <div className="header-search">
                    <Search className="header-search-icon" size={18} />
                    <input type="text" placeholder="Search projects, vendors, materials..." />
                </div>
            </div>
            <div className="header-right">
                <div className="header-user-dropdown" ref={dropdownRef}>
                    <button
                        type="button"
                        className="header-user-trigger"
                        onClick={() => setDropdownOpen((o) => !o)}
                        aria-expanded={dropdownOpen}
                        aria-haspopup="true"
                    >
                        {user && <Avatar userId={user.id} name={displayName} email={user.email} size="sm" className="header-user-avatar" />}
                        <span>{displayName}</span>
                    </button>
                    {dropdownOpen && (
                        <div className="header-user-menu">
                            <button
                                type="button"
                                className="header-user-menu-item header-user-menu-item-bold"
                                onClick={() => handleNav('/settings')}
                            >
                                My Account
                            </button>
                            <div className="header-user-menu-divider" />
                            <button
                                type="button"
                                className="header-user-menu-item"
                                onClick={() => handleNav('/settings')}
                            >
                                View Profile
                            </button>
                            <div className="header-user-menu-divider" />
                            <button
                                type="button"
                                className="header-user-menu-item header-user-menu-item-logout"
                                onClick={handleLogout}
                            >
                                <LogOut size={18} />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
