import { Search, User, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom';

export default function Header() {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    }

    return (
        <header className="header">
            <div className="header-left">
                <div className="header-search">
                    <Search className="header-search-icon" size={18} />
                    <input type="text" placeholder="Search projects, vendors, materials..." />
                </div>
            </div>
            <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="header-user">
                    <User className="header-user-icon" size={20} />
                    <span>{user?.email || 'User'}</span>
                </div>
                <button
                    onClick={handleLogout}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}
                    title="Logout"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </header>
    )
}
