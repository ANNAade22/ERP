import { useMemo, useState, useEffect, useRef } from 'react'
import { Camera, ImageMinus, KeyRound, Loader2, Save, Trash2, UserCheck, UserX, UserPlus, X } from 'lucide-react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import Avatar from '../components/Avatar'

const ROLES = ['ADMIN', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'ACCOUNTANT', 'STORE_OFFICER'] as const

interface RegistryUser {
    id: string
    name: string
    email: string
    role: string
    active?: boolean
    avatar_path?: string
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
    const [showRemoveAvatarModal, setShowRemoveAvatarModal] = useState(false)
    const [removeAvatarTarget, setRemoveAvatarTarget] = useState<RegistryUser | null>(null)
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
    const [addFormAvatarFile, setAddFormAvatarFile] = useState<File | null>(null)
    const addFormAvatarInputRef = useRef<HTMLInputElement>(null)
    const [avatarUploadingId, setAvatarUploadingId] = useState<string | null>(null)
    const [avatarRemovingId, setAvatarRemovingId] = useState<string | null>(null)
    const [avatarVersion, setAvatarVersion] = useState<Record<string, number>>({})
    const avatarFileInputRef = useRef<HTMLInputElement>(null)
    const avatarUploadTargetRef = useRef<RegistryUser | null>(null)

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
            const regRes = await api.post<{ data?: { id?: string } }>('/auth/register', {
                name: addForm.name.trim(),
                email: addForm.email.trim().toLowerCase(),
                password: addForm.password,
                role: addForm.role,
            })
            const newUser = regRes.data?.data
            const newId = newUser?.id
            if (addFormAvatarFile && newId) {
                const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
                if (allowed.includes(addFormAvatarFile.type) && addFormAvatarFile.size <= 2 * 1024 * 1024) {
                    try {
                        const formData = new FormData()
                        formData.append('file', addFormAvatarFile)
                        await api.post(`/users/${newId}/avatar`, formData)
                        toast.success('User added with profile picture.')
                    } catch {
                        toast.success('User added. Profile picture upload failed.')
                    }
                } else {
                    toast.success('User added. (Photo skipped: invalid type or size)')
                }
            } else {
                toast.success('User registered successfully.')
            }
            setShowAddModal(false)
            setAddForm({ name: '', email: '', password: '', role: 'SITE_ENGINEER' })
            setAddFormAvatarFile(null)
            addFormAvatarInputRef.current && (addFormAvatarInputRef.current.value = '')
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

    const triggerAvatarUpload = (targetUser: RegistryUser) => {
        avatarUploadTargetRef.current = targetUser
        avatarFileInputRef.current?.click()
    }

    const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const targetUser = avatarUploadTargetRef.current
        if (!targetUser) return
        avatarUploadTargetRef.current = null
        await handleAvatarUpload(e, targetUser)
    }

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetUser: RegistryUser) => {
        const file = e.target.files?.[0]
        if (!file) return
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if (!allowed.includes(file.type)) {
            toast.error('Please choose a JPEG, PNG, GIF, or WebP image.')
            return
        }
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be 2 MB or smaller.')
            return
        }
        setAvatarUploadingId(targetUser.id)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await api.post<{ data?: { avatar_path?: string } }>(`/users/${targetUser.id}/avatar`, formData)
            const updated = res.data?.data
            if (updated?.avatar_path) {
                setUsers((prev) =>
                    prev.map((u) => (u.id === targetUser.id ? { ...u, avatar_path: updated!.avatar_path } : u))
                )
            }
            setAvatarVersion((v) => ({ ...v, [targetUser.id]: (v[targetUser.id] ?? 0) + 1 }))
            toast.success(`Profile picture updated for ${targetUser.name}`)
        } catch (err: unknown) {
            const ax = err as { response?: { data?: { message?: string } } }
            toast.error(ax.response?.data?.message || 'Failed to upload picture')
        } finally {
            setAvatarUploadingId(null)
            e.target.value = ''
        }
    }

    const openRemoveAvatarModal = (targetUser: RegistryUser) => {
        setRemoveAvatarTarget(targetUser)
        setShowRemoveAvatarModal(true)
    }

    const handleRemoveAvatarConfirm = async () => {
        const targetUser = removeAvatarTarget
        if (!targetUser) return
        setAvatarRemovingId(targetUser.id)
        try {
            const res = await api.delete<{ success?: boolean }>(`/users/${targetUser.id}/avatar`)
            if (res.data?.success) {
                setUsers((prev) =>
                    prev.map((u) => (u.id === targetUser.id ? { ...u, avatar_path: '' } : u))
                )
                setAvatarVersion((v) => ({ ...v, [targetUser.id]: (v[targetUser.id] ?? 0) + 1 }))
                toast.success('Profile picture removed')
                setShowRemoveAvatarModal(false)
                setRemoveAvatarTarget(null)
            } else {
                toast.error('Failed to remove profile picture')
            }
        } catch (err: unknown) {
            const ax = err as { response?: { data?: { message?: string }; status?: number } }
            const msg = ax.response?.data?.message ?? (ax.response?.status === 404 ? 'Avatar endpoint not found.' : 'Failed to remove profile picture.')
            toast.error(msg)
        } finally {
            setAvatarRemovingId(null)
        }
    }

    const handleSetActive = async (targetUser: RegistryUser, active: boolean) => {
        if (targetUser.id === currentUser?.id && !active) {
            toast.error('You cannot deactivate your own account.')
            return
        }
        setRowLoadingId(targetUser.id)
        try {
            const res = await api.patch(`/users/${targetUser.id}/status`, { active })
            if (res.data?.success) {
                setUsers((prev) =>
                    prev.map((u) => (u.id === targetUser.id ? { ...u, active } : u))
                )
                toast.success(active ? 'User activated.' : 'User deactivated.')
            } else {
                toast.error('Failed to update status.')
            }
        } catch (err: unknown) {
            const ax = err as { response?: { data?: { message?: string } } }
            toast.error(ax.response?.data?.message || 'Failed to update status.')
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

    const startTour = () => {
        const steps: { element: string; popover: { title: string; description: string } }[] = [
            { element: '#registry-header', popover: { title: 'User Registry', description: 'View and manage all users and their roles. Only admins can add users or change roles. Use "Take tour" anytime to see these tips again. Click Close or press Escape to skip.' } },
            { element: '#registry-add-area', popover: { title: 'Add user', description: isAdmin ? 'Register a new user with name, email, password, role, and optionally a profile picture. Click to open the form.' : 'Only admins see the Add user button here. You can still view and search the user list.' } },
            { element: '#registry-filters', popover: { title: 'Search and filter', description: 'Search by name, email, or role. Use "Filter by role" to show only one role (e.g. SITE_ENGINEER or ADMIN).' } },
            { element: '#registry-table-card', popover: { title: 'Users list', description: 'All registered users. Each row shows user, email, role, status (Active/Inactive), and creation date.' } },
            { element: '#registry-table-actions-hint', popover: { title: 'Managing users', description: 'Profile picture: use the camera icon to set or change a user\'s profile picture. Status: use the activate/deactivate icon next to Active/Inactive to enable or disable login (e.g. when they leave). Role: change from the dropdown, then click Save. Reset password: set a new password. Delete: remove the user (use with care). Only admins can edit; you cannot change your own role. Press Escape to close any modal.' } },
        ]
        const driverObj = driver({
            showProgress: true,
            steps,
            onDestroyed: () => { try { localStorage.setItem('registry-tour-done', 'true') } catch { /* ignore */ } },
        })
        driverObj.drive()
    }

    return (
        <div>
            <input
                ref={avatarFileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarFileChange}
                className="registry-avatar-input"
                aria-hidden
            />
            <div id="registry-header" className="page-header">
                <div className="page-header-info">
                    <h1>User Registry</h1>
                    <p>View and manage users by role. Only admins can access this page.</p>
                </div>
                <div className="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <button type="button" className="btn btn-secondary" onClick={startTour} title="Take a guided tour">Take tour</button>
                    <div id="registry-add-area" style={{ display: 'inline-flex' }}>
                        {isAdmin ? (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setShowAddModal(true)}
                            >
                                <UserPlus size={18} />
                                Add user
                            </button>
                        ) : (
                            <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)', alignSelf: 'center' }}>Add user (Admin only)</span>
                        )}
                    </div>
                </div>
            </div>

            <div id="registry-filters" className="filter-row" style={{ marginBottom: 'var(--space-4)' }}>
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

            <div id="registry-table-card" className="content-card">
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
                    <div id="registry-table-actions-hint" className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
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
                                            <td>
                                                <div className="registry-user-cell">
                                                    <Avatar key={`avatar-${u.id}-${avatarVersion[u.id] ?? 0}`} userId={u.id} name={u.name} size="sm" skipImage={!u.avatar_path} />
                                                    <span style={{ fontWeight: 500 }}>{u.name}</span>
                                                </div>
                                            </td>
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
                                            <td>
                                                <div className="registry-status-cell">
                                                    <span className={`registry-status-badge ${u.active !== false ? 'registry-status-active' : 'registry-status-inactive'}`}>
                                                        {u.active !== false ? 'Active' : 'Inactive'}
                                                    </span>
                                                    {isAdmin && !isSelf && (
                                                        <button
                                                            type="button"
                                                            className="btn-icon"
                                                            title={busy ? 'Updating…' : (u.active !== false ? 'Deactivate user' : 'Activate user')}
                                                            disabled={busy}
                                                            onClick={() => handleSetActive(u, u.active === false)}
                                                        >
                                                            {u.active !== false ? <UserX size={16} /> : <UserCheck size={16} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                            <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                                            <td>
                                                <div className="actions">
                                                    <button
                                                        type="button"
                                                        className="btn-icon"
                                                        title={avatarUploadingId === u.id ? 'Uploading…' : 'Upload profile picture'}
                                                        disabled={!isAdmin || busy || avatarUploadingId === u.id || avatarRemovingId === u.id}
                                                        onClick={() => triggerAvatarUpload(u)}
                                                    >
                                                        <Camera size={16} />
                                                    </button>
                                                    {isAdmin && u.avatar_path && (
                                                        <button
                                                            type="button"
                                                            className="btn-icon"
                                                            title={avatarRemovingId === u.id ? 'Removing…' : 'Remove profile picture'}
                                                            disabled={busy || avatarUploadingId === u.id || avatarRemovingId === u.id}
                                                            onClick={() => openRemoveAvatarModal(u)}
                                                        >
                                                            {avatarRemovingId === u.id ? (
                                                                <Loader2 className="spin" size={16} />
                                                            ) : (
                                                                <ImageMinus size={16} />
                                                            )}
                                                        </button>
                                                    )}
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
                <div className="modal-overlay" onClick={() => {
                    if (!addLoading) {
                        setAddFormAvatarFile(null)
                        addFormAvatarInputRef.current && (addFormAvatarInputRef.current.value = '')
                        setShowAddModal(false)
                    }
                }}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                        <div className="modal-header">
                            <h2 style={{ margin: 0, fontSize: 'var(--font-lg)' }}>Add user</h2>
                            <button
                                type="button"
                                className="btn-icon"
                                onClick={() => {
                                    if (!addLoading) {
                                        setAddFormAvatarFile(null)
                                        addFormAvatarInputRef.current && (addFormAvatarInputRef.current.value = '')
                                        setShowAddModal(false)
                                    }
                                }}
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
                                <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                                    <span className="form-label">Profile picture (optional)</span>
                                    <input
                                        ref={addFormAvatarInputRef}
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                                        onChange={(e) => setAddFormAvatarFile(e.target.files?.[0] ?? null)}
                                        className="form-input"
                                    />
                                </label>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', padding: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        setAddFormAvatarFile(null)
                                        addFormAvatarInputRef.current && (addFormAvatarInputRef.current.value = '')
                                        setShowAddModal(false)
                                    }}
                                    disabled={addLoading}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={addLoading}>
                                    {addLoading ? 'Adding user…' : 'Add user'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showRemoveAvatarModal && removeAvatarTarget && (
                <div className="modal-overlay" onClick={() => {
                    if (!avatarRemovingId) {
                        setShowRemoveAvatarModal(false)
                        setRemoveAvatarTarget(null)
                    }
                }}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                        <div className="modal-header">
                            <h2 style={{ margin: 0, fontSize: 'var(--font-lg)' }}>Remove profile picture</h2>
                            <button
                                type="button"
                                className="btn-icon"
                                onClick={() => !avatarRemovingId && (setShowRemoveAvatarModal(false), setRemoveAvatarTarget(null))}
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: 'var(--space-4)' }}>
                            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
                                Remove the profile picture for <strong>{removeAvatarTarget.name}</strong>? The avatar will revert to initials.
                            </p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', padding: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowRemoveAvatarModal(false)
                                    setRemoveAvatarTarget(null)
                                }}
                                disabled={!!avatarRemovingId}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={handleRemoveAvatarConfirm}
                                disabled={!!avatarRemovingId}
                            >
                                {avatarRemovingId ? (
                                    <>
                                        <Loader2 className="spin" size={16} style={{ marginRight: 'var(--space-2)' }} />
                                        Removing…
                                    </>
                                ) : (
                                    'Remove picture'
                                )}
                            </button>
                        </div>
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
