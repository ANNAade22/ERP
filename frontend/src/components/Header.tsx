import { Search, User } from 'lucide-react'

export default function Header() {
    return (
        <header className="header">
            <div className="header-left">
                <div className="header-search">
                    <Search className="header-search-icon" size={18} />
                    <input type="text" placeholder="Search projects, vendors, materials..." />
                </div>
            </div>
            <div className="header-right">
                <div className="header-user">
                    <User className="header-user-icon" size={20} />
                    <span>Admin</span>
                </div>
            </div>
        </header>
    )
}
