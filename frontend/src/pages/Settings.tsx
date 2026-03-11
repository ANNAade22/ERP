import { useEffect, useState, useRef } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import api from '../utils/api'
import toast from 'react-hot-toast'
import Avatar from '../components/Avatar'

const COMPANY_STORAGE_KEY = 'erp-company-settings'

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2 MB

type Profile = {
    id: string
    name: string
    email: string
    phone: string
    role: string
    avatar_path?: string
}

type CompanySettings = {
    companyName: string
    taxId: string
    address: string
    currency: string
}

const defaultCompany: CompanySettings = {
    companyName: 'Construction Corp Ltd.',
    taxId: '22AAAAA0000A1Z5',
    address: '123 Business Park, Downtown',
    currency: 'USD',
}

function loadCompanyFromStorage(): CompanySettings {
    try {
        const raw = localStorage.getItem(COMPANY_STORAGE_KEY)
        if (raw) {
            const parsed = JSON.parse(raw) as Partial<CompanySettings>
            return { ...defaultCompany, ...parsed }
        }
    } catch {
        /* ignore */
    }
    return { ...defaultCompany }
}

function saveCompanyToStorage(company: CompanySettings) {
    try {
        localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(company))
    } catch {
        /* ignore */
    }
}

export default function Settings() {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '' })
    const [company, setCompany] = useState<CompanySettings>(defaultCompany)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get<{ data: Profile }>('/profile')
                const user = res.data?.data ?? res.data
                if (user) {
                    setProfile(user as Profile)
                    setProfileForm({
                        name: (user as Profile).name ?? '',
                        email: (user as Profile).email ?? '',
                        phone: (user as Profile).phone ?? '',
                    })
                }
            } catch (err) {
                const status = (err as { response?: { status?: number } })?.response?.status
                if (status === 404 || status === 401) {
                    setProfileForm({ name: '', email: '', phone: '' })
                } else {
                    toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to load profile')
                }
            } finally {
                setLoading(false)
            }
        }
        fetchProfile()
        setCompany(loadCompanyFromStorage())
    }, [])

    const handleSaveChanges = async () => {
        setSaving(true)
        try {
            await api.patch('/profile', {
                name: profileForm.name.trim(),
                email: profileForm.email.trim(),
                phone: profileForm.phone.trim(),
            })
            saveCompanyToStorage(company)
            setProfile((prev) => (prev ? { ...prev, ...profileForm } : null))
            toast.success('Settings saved successfully')
        } catch (err: unknown) {
            const ax = err as { response?: { data?: { message?: string }; status?: number } }
            const msg = ax.response?.data?.message || 'Failed to save settings'
            toast.error(msg)
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => {
        if (profile) {
            setProfileForm({ name: profile.name, email: profile.email, phone: profile.phone ?? '' })
        }
        setCompany(loadCompanyFromStorage())
        toast.success('Changes discarded')
    }

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !profile) return
        if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
            toast.error('Please choose a JPEG, PNG, GIF, or WebP image.')
            return
        }
        if (file.size > MAX_AVATAR_BYTES) {
            toast.error('Image must be 2 MB or smaller.')
            return
        }
        setUploadingAvatar(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await api.post<{ data: Profile }>('/profile/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            const updated = res.data?.data ?? res.data
            if (updated && 'id' in updated) {
                setProfile(updated as Profile)
                toast.success('Profile picture updated')
            }
        } catch (err: unknown) {
            const ax = err as { response?: { data?: { message?: string } } }
            toast.error(ax.response?.data?.message || 'Failed to upload picture')
        } finally {
            setUploadingAvatar(false)
            e.target.value = ''
            fileInputRef.current?.value && (fileInputRef.current.value = '')
        }
    }

    const startTour = () => {
        const driverObj = driver({
            showProgress: true,
            steps: [
                { element: '#settings-header', popover: { title: 'Settings', description: 'Manage your account and system preferences. Use "Take tour" anytime to see these tips again. Click Close or press Escape to skip.' } },
                { element: '#settings-profile', popover: { title: 'Profile Settings', description: 'Update your full name, email, phone, and view your role.' } },
                { element: '#settings-company', popover: { title: 'Company Information', description: 'Company name, tax ID, address, and currency (saved in browser).' } },
            ],
            onDestroyed: () => { try { localStorage.setItem('settings-tour-done', 'true') } catch { /* ignore */ } },
        })
        driverObj.drive()
    }

    if (loading) {
        return (
            <div className="page-header">
                <p>Loading settings…</p>
            </div>
        )
    }

    return (
        <div>
            {/* Page Header */}
            <div id="settings-header" className="page-header">
                <div className="page-header-info">
                    <h1>Settings</h1>
                    <p>Manage your account and system preferences</p>
                </div>
                <div className="page-header-actions">
                    <button type="button" className="btn btn-secondary" onClick={startTour} title="Take a guided tour">Take tour</button>
                </div>
            </div>

            {/* Profile Settings */}
            <div id="settings-profile" className="content-card">
                <div className="settings-section">
                    <div className="settings-section-title">Profile Settings</div>
                    <div className="settings-row settings-row-avatar">
                        <div className="form-group">
                            <label className="form-label">Profile picture</label>
                            <div className="settings-avatar-block">
                                {profile && (
                                    <Avatar userId={profile.id} name={profile.name} email={profile.email} size="lg" />
                                )}
                                <div className="settings-avatar-actions">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                                        onChange={handleAvatarChange}
                                        disabled={uploadingAvatar}
                                        className="settings-avatar-input"
                                        aria-label="Upload profile picture"
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploadingAvatar}
                                    >
                                        {uploadingAvatar ? 'Uploading…' : 'Upload photo'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="settings-row">
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input
                                className="form-input"
                                type="text"
                                value={profileForm.name}
                                onChange={(e) => setProfileForm((p) => ({ ...p, name: e.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                className="form-input"
                                type="email"
                                value={profileForm.email}
                                onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="settings-row">
                        <div className="form-group">
                            <label className="form-label">Phone Number</label>
                            <input
                                className="form-input"
                                type="tel"
                                value={profileForm.phone}
                                onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                                placeholder="+91 98765 43210"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <input
                                className="form-input"
                                type="text"
                                value={profile?.role ?? ''}
                                disabled
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Company Settings (localStorage) */}
            <div id="settings-company" className="content-card">
                <div className="settings-section">
                    <div className="settings-section-title">Company Information</div>
                    <p className="form-hint" style={{ marginBottom: 'var(--space-4)' }}>
                        Stored locally in your browser. Use Save Changes below to persist.
                    </p>
                    <div className="settings-row">
                        <div className="form-group">
                            <label className="form-label">Company Name</label>
                            <input
                                className="form-input"
                                type="text"
                                value={company.companyName}
                                onChange={(e) => setCompany((c) => ({ ...c, companyName: e.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">GST / Tax ID</label>
                            <input
                                className="form-input"
                                type="text"
                                value={company.taxId}
                                onChange={(e) => setCompany((c) => ({ ...c, taxId: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="settings-row">
                        <div className="form-group">
                            <label className="form-label">Address</label>
                            <input
                                className="form-input"
                                type="text"
                                value={company.address}
                                onChange={(e) => setCompany((c) => ({ ...c, address: e.target.value }))}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Currency</label>
                            <select
                                className="filter-select"
                                style={{ width: '100%', height: '42px' }}
                                value={company.currency}
                                onChange={(e) => setCompany((c) => ({ ...c, currency: e.target.value }))}
                            >
                                <option value="USD">USD ($)</option>
                                <option value="INR">INR (₹)</option>
                                <option value="EUR">EUR (€)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save / Cancel */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSaveChanges}
                    disabled={saving}
                >
                    {saving ? 'Saving…' : 'Save Changes'}
                </button>
            </div>
        </div>
    )
}
