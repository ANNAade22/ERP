import { useMemo, useState, useEffect } from 'react'
import { KeyRound, Save, Trash2, UserPlus, X } from 'lucide-react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'ACCOUNTANT', 'STORE_OFFICER'] as const

interface RegistryUser {
    id: string
    name: string
    email: string
    role: string
    created_at: string
}

export default function Registry() {
    const { user: currentUser } = useAuth()
    const [users, setUsers] = useState<RegistryUser[]>([])
    const [loading, setLoading] = useState(true)
    const [roleFilter, setRoleFilter] = useState('')
    const [search, setSearch] = useState('')
    const [rowLoadingId, setRowLoadingId] = useState<string | null>(null)
    const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({})
    const [showAddModal, setShowAddModal] = useState(false)
    const [showResetModal, setShowResetModal] = useState(false)
    const [resetTarget, setResetTarget] = useState<RegistryUser | null>(null)
    const [addLoading, setAddLoading] = useState(false)
    const [resetLoading, setResetLoading] = useState(false)
    const [resetForm, setResetForm] = useState({ password: '', confirmPassword: '' })
    const [addForm, setAddForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'SITE_ENGINEER' as string,
    })

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const url = roleFilter ? `/users?role=${encodeURIComponent(roleFilter)}` : '/users'
            const res = await api.get(url)
            if (res.data?.success && Array.isArray(res.data.data)) {
                const list = res.data.data as RegistryUser[]
                setUsers(list)
                setPendingRoles(
                    Object.fromEntries(list.map((u) => [u.id, u.role]))
                )
            } else {
                setUsers([])
            }
        } catch (err: unknown) {
            const ax = err as { response?: { status?: number } }
            if (ax.response?.status === 403) {
                toast.error('You do not have access to the user registry.')
            } else {
                toast.error('Failed to load users.')
            }
            setUsers([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [roleFilter])

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!addForm.name.trim() || !addForm.email.trim() || !addForm.password.trim()) {
            toast.error('Name, email and password are required.')
            return
        }
        if (addForm.password.length < 6) {
            toast.error('Password must be at least 6 characters.')
            return
        }
        setAddLoading(true)
        try {
            await api.post('/auth/register', {
                name: addForm.name.trim(),
                email: addForm.email.trim().toLowerCase(),
                password: addForm.password,
                role: addForm.role,
            })
            toast.success('User registered successfully.')
            setShowAddModal(false)
            setAddForm({ name: '', email: '', password: '', role: 'SITE_ENGINEER' })
            fetchUsers()
        } catch (err: unknown) {
            const ax = err as { response?: { data?: { message?: string }; status?: number } }
            const msg = ax.response?.status === 409
                ? 'A user with this email already exists.'
                : (ax.response?.data?.message || 'Failed to register user.')
            toast.error(msg)
        } finally {
            setAddLoading(false)
        }
    }

    const handleRoleUpdate = async (targetUser: RegistryUser) => {
        const nextRole = pendingRoles[targetUser.id]
        if (!nextRole || nextRole === targetUser.role) return
        setRowLoadingId(targetUser.id)
        try {
            const res = await api.patch(`/users/${targetUser.id}/role`, { role: nextRole })
            if (res.data?.success) {
                toast.success('Role updated.')
                setUsers((prev) =>
                    prev.map((u) => (u.id === targetUser.id ? { ...u, role: nextRole } : u))
                )
            } else {
                toast.error('Failed to update role.')
            }
        } catch (err: unknown) {
            const ax = err as { response?: { data?: { message?: string } } }
            toast.error(ax.response?.data?.message || 'Failed to update role.')
        } finally {
            setRowLoadingId(null)
        }
    }

    const handleDeleteUser = async (targetUser: RegistryUser) => {
        const ok = window.confirm(`Delete user "${targetUser.name}"?`)
        if (!ok) return
        setRowLoadingId(targetUser.id)
        try {
            const res = await api.delete(`/users/${targetUser.id}`)
            if (res.data?.success) {
                toast.success('User deleted.')
                setUsers((prev) => prev.filter((u) => u.id !== targetUser.id))
            } else {
                toast.error('Failed to delete user.')
            }
        } catch (err: unknown) {
            const ax = err as { response?: { data?: { message?: string } } }
            toast.error(ax.response?.data?.message || 'Failed to delete user.')
        } finally {
            setRowLoadingId(null)
        }
    }

    const openResetModal = (targetUser: RegistryUser) => {
        setResetTarget(targetUser)
        setResetForm({ password: '', confirmPassword: '' })
        setShowResetModal(true)
    }

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!resetTarget) return
        if (resetForm.password.length < 6) {
            toast.error('Password must be at least 6 characters.')
            return
        }
        if (resetForm.password !== resetForm.confirmPassword) {
            toast.error('Passwords do not match.')
            return
        }
        setResetLoading(true)
        try {
            const res = await api.patch(`/users/${resetTarget.id}/password`, {
                password: resetForm.password,
            })
            if (res.data?.success) {
                toast.success('Password reset successfully.')
                setShowResetModal(false)
                setResetTarget(null)
            } else {
                toast.error('Failed to reset password.')
            }
        } catch (err: unknown) {
            const ax = err as { response?: { data?: { message?: string } } }
            toast.error(ax.response?.data?.message || 'Failed to reset password.')
        } finally {
            setResetLoading(false)
        }
    }

    const isAdmin = currentUser?.role === 'ADMIN'
    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return users
        return users.filter(
            (u) =>
                u.name.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.role.toLowerCase().includes(q)
        )
    }, [search, users])

    return (
        <div>
            <div className="page-header">
                <div className="page-header-info">
                    <h1>User Registry</h1>
                    <p>View and manage users by role. Only admins can access this page.</p>
                </div>
                {isAdmin && (
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setShowAddModal(true)}
                    >
                        <UserPlus size={18} />
                        Add user
                    </button>
                )}
            </div>

            <div className="filter-row" style={{ marginBottom: 'var(--space-4)' }}>
                <input
                    className="filter-input"
                    type="text"
                    placeholder="Search by name, email, or role..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                    Filter by role
                    <select
                        className="filter-select"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="">All roles</option>
                        {ROLES.map((r) => (
                            <option key={r} value={r}>{r.replace('_', ' ')}</option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="content-card">
                <div className="content-card-header">
                    <div>
                        <div className="content-card-title">Users</div>
                        <div className="content-card-subtitle">
                            {roleFilter ? `Showing ${roleFilter.replace('_', ' ')} only` : 'All users'}
                        </div>
                    </div>
                </div>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Loading…
                    </div>
                ) : (
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                            No users found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((u) => {
                                        const currentPending = pendingRoles[u.id] ?? u.role
                                        const dirty = currentPending !== u.role
                                        const isSelf = currentUser?.id === u.id
                                        const busy = rowLoadingId === u.id
                                        return (
                                        <tr key={u.id}>
                                            <td style={{ fontWeight: 500 }}>{u.name}</td>
                                            <td>{u.email}</td>
                                            <td>
                                                <select
                                                    className="filter-select"
                                                    value={currentPending}
                                                    onChange={(e) =>
                                                        setPendingRoles((prev) => ({
                                                            ...prev,
                                                            [u.id]: e.target.value,
                                                        }))
                                                    }
                                                    disabled={!isAdmin || isSelf || busy}
                                                    style={{ minWidth: '180px' }}
                                                >
                                                    {ROLES.map((r) => (
                                                        <option key={r} value={r}>
                                                            {r.replace('_', ' ')}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                                            <td>
                                                <div className="actions">
                                                    <button
                                                        type="button"
                                                        className="btn-icon"
                                                        title="Save role"
                                                        disabled={!dirty || !isAdmin || isSelf || busy}
                                                        onClick={() => handleRoleUpdate(u)}
                                                    >
                                                        <Save size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-icon"
                                                        title="Reset password"
                                                        disabled={!isAdmin || isSelf || busy}
                                                        onClick={() => openResetModal(u)}
                                                    >
                                                        <KeyRound size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn-icon danger"
                                                        title="Delete user"
                                                        disabled={!isAdmin || isSelf || busy}
                                                        onClick={() => handleDeleteUser(u)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {showAddModal && (
                <div className="modal-overlay" onClick={() => !addLoading && setShowAddModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                        <div className="modal-header">
                            <h2 style={{ margin: 0, fontSize: 'var(--font-lg)' }}>Add user</h2>
                            <button
                                type="button"
                                className="btn-icon"
                                onClick={() => !addLoading && setShowAddModal(false)}
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAddUser}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                                    <span className="form-label">Name</span>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={addForm.name}
                                        onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                                        placeholder="Full name"
                                        required
                                    />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                                    <span className="form-label">Email</span>
                                    <input
                                        type="email"
                                        className="form-input"
                                        value={addForm.email}
                                        onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                                        placeholder="user@example.com"
                                        required
                                    />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                                    <span className="form-label">Password</span>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={addForm.password}
                                        onChange={(e) => setAddForm((f) => ({ ...f, password: e.target.value }))}
                                        placeholder="Min 6 characters"
                                        minLength={6}
                                        required
                                    />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                                    <span className="form-label">Role</span>
                                    <select
                                        className="form-input"
                                        value={addForm.role}
                                        onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                                    >
                                        {ROLES.map((r) => (
                                            <option key={r} value={r}>{r.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', padding: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowAddModal(false)}
                                    disabled={addLoading}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                                    {addLoading ? 'Adding…' : 'Add user'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showResetModal && resetTarget && (
                <div className="modal-overlay" onClick={() => !resetLoading && setShowResetModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                        <div className="modal-header">
                            <h2 style={{ margin: 0, fontSize: 'var(--font-lg)' }}>Reset password</h2>
                            <button
                                type="button"
                                className="btn-icon"
                                onClick={() => !resetLoading && setShowResetModal(false)}
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleResetPassword}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
                                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                                    Set a new password for <strong>{resetTarget.name}</strong>.
                                </p>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                                    <span className="form-label">New password</span>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={resetForm.password}
                                        onChange={(e) => setResetForm((f) => ({ ...f, password: e.target.value }))}
                                        placeholder="Min 6 characters"
                                        minLength={6}
                                        required
                                    />
                                </label>
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                                    <span className="form-label">Confirm password</span>
                                    <input
                                        type="password"
                                        className="form-input"
                                        value={resetForm.confirmPassword}
                                        onChange={(e) => setResetForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                                        placeholder="Re-enter password"
                                        minLength={6}
                                        required
                                    />
                                </label>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', padding: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowResetModal(false)}
                                    disabled={resetLoading}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={resetLoading}>
                                    {resetLoading ? 'Saving…' : 'Set password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
