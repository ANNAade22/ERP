import { useCallback, useEffect, useState } from 'react'
import {
    Phone,
    Mail,
    MapPin,
    Star,
    Pencil,
    Trash2,
    X,
    Search,
} from 'lucide-react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import api from '../../utils/api'
import toast from 'react-hot-toast'

interface VendorWithStats {
    id: string
    name: string
    contact_name?: string
    phone?: string
    email?: string
    address?: string
    gst_number?: string
    type?: string
    status?: string
    rating?: number
    description?: string
    is_active?: boolean
    projects_count?: number
    total_value?: number
    reliability_pct?: number
    created_at?: string
    updated_at?: string
}

const STATUS_OPTIONS = [
    { value: 'ACTIVE', label: 'Active', badge: 'success' },
    { value: 'PREFERRED', label: 'Preferred', badge: 'info' },
    { value: 'INACTIVE', label: 'Inactive', badge: 'neutral' },
] as const

const TYPE_OPTIONS = ['', 'KSO', 'Supplier', 'Contractor', 'Service Provider']

function statusToBadge(status: string): string {
    const s = (status || 'ACTIVE').toUpperCase()
    const found = STATUS_OPTIONS.find((o) => o.value === s)
    return found ? found.badge : 'neutral'
}

function statusToLabel(status: string): string {
    const s = (status || 'ACTIVE').toUpperCase()
    const found = STATUS_OPTIONS.find((o) => o.value === s)
    return found ? found.label : s
}

interface VendorFormState {
    name: string
    contact_name: string
    phone: string
    email: string
    address: string
    gst_number: string
    type: string
    status: string
    rating: number
    description: string
}

const INITIAL_FORM: VendorFormState = {
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
    type: '',
    status: 'ACTIVE',
    rating: 0,
    description: '',
}

export default function ManageContractors() {
    const [vendors, setVendors] = useState<VendorWithStats[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [addModalOpen, setAddModalOpen] = useState(false)
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<VendorWithStats | null>(null)
    const [editingVendor, setEditingVendor] = useState<VendorWithStats | null>(null)
    const [form, setForm] = useState<VendorFormState>(INITIAL_FORM)
    const [submitting, setSubmitting] = useState(false)
    const [searchQ, setSearchQ] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQ), 300)
        return () => clearTimeout(t)
    }, [searchQ])

    const fetchVendors = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams({ include_inactive: 'true' })
            if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())
            const res = await api.get<{ success?: boolean; data?: VendorWithStats[] }>(
                `/vendors?${params.toString()}`
            )
            if (res.data?.success && Array.isArray(res.data.data)) {
                setVendors(res.data.data)
            } else {
                setVendors([])
            }
        } catch (e: unknown) {
            const msg = e && typeof e === 'object' && 'response' in e
                ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
                : 'Failed to load vendors'
            setError(String(msg || 'Failed to load vendors'))
            setVendors([])
        } finally {
            setLoading(false)
        }
    }, [debouncedSearch])

    useEffect(() => {
        fetchVendors()
    }, [fetchVendors])

    const startTour = () => {
        const driverObj = driver({
            showProgress: true,
            steps: [
                { element: '#vendors-header', popover: { title: 'Vendors', description: 'Manage suppliers, contractors, and service providers. Click + Add Vendor to create one.' } },
                { element: '#vendors-add-btn', popover: { title: 'Add Vendor', description: 'Add a new vendor or contractor to the system.' } },
                { element: '#vendors-cards', popover: { title: 'Vendor cards', description: 'Each card shows contact info, projects, total value, and reliability. Use the icons to edit or remove a vendor.' } },
            ],
            onDestroyed: () => { try { localStorage.setItem('vendors-tour-done', 'true') } catch { /* ignore */ } },
        })
        driverObj.drive()
    }

    const openAddModal = () => {
        setForm(INITIAL_FORM)
        setAddModalOpen(true)
    }

    const openEditModal = (v: VendorWithStats) => {
        setEditingVendor(v)
        setForm({
            name: v.name || '',
            contact_name: v.contact_name || '',
            phone: v.phone || '',
            email: v.email || '',
            address: v.address || '',
            gst_number: v.gst_number || '',
            type: v.type || '',
            status: (v.status || 'ACTIVE').toUpperCase(),
            rating: typeof v.rating === 'number' ? Math.min(5, Math.max(0, v.rating)) : 0,
            description: v.description || '',
        })
        setEditModalOpen(true)
    }

    const closeAddModal = () => setAddModalOpen(false)
    const closeEditModal = () => {
        setEditModalOpen(false)
        setEditingVendor(null)
    }

    const handleCreate = async () => {
        if (!form.name.trim()) {
            toast.error('Name is required')
            return
        }
        setSubmitting(true)
        try {
            await api.post('/vendors', {
                name: form.name.trim(),
                contact_name: form.contact_name.trim() || undefined,
                phone: form.phone.trim() || undefined,
                email: form.email.trim() || undefined,
                address: form.address.trim() || undefined,
                gst_number: form.gst_number.trim() || undefined,
                type: form.type.trim() || undefined,
                status: form.status || undefined,
                rating: form.rating,
                description: form.description.trim() || undefined,
            })
            toast.success('Vendor created successfully')
            closeAddModal()
            setForm(INITIAL_FORM)
            fetchVendors()
        } catch (e: unknown) {
            const msg = e && typeof e === 'object' && 'response' in e
                ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
                : 'Failed to create vendor'
            toast.error(String(msg))
        } finally {
            setSubmitting(false)
        }
    }

    const handleUpdate = async () => {
        if (!editingVendor?.id || !form.name.trim()) {
            toast.error('Name is required')
            return
        }
        setSubmitting(true)
        try {
            await api.put(`/vendors/${editingVendor.id}`, {
                name: form.name.trim(),
                contact_name: form.contact_name.trim() || undefined,
                phone: form.phone.trim() || undefined,
                email: form.email.trim() || undefined,
                address: form.address.trim() || undefined,
                gst_number: form.gst_number.trim() || undefined,
                type: form.type.trim() || undefined,
                status: form.status || undefined,
                rating: form.rating,
                description: form.description.trim() || undefined,
            })
            toast.success('Vendor updated successfully')
            closeEditModal()
            fetchVendors()
        } catch (e: unknown) {
            const msg = e && typeof e === 'object' && 'response' in e
                ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
                : 'Failed to update vendor'
            toast.error(String(msg))
        } finally {
            setSubmitting(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteConfirm?.id) return
        setSubmitting(true)
        try {
            await api.delete(`/vendors/${deleteConfirm.id}`)
            toast.success('Vendor deleted successfully')
            setDeleteConfirm(null)
            fetchVendors()
        } catch (e: unknown) {
            const msg = e && typeof e === 'object' && 'response' in e
                ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
                : 'Failed to delete vendor'
            toast.error(String(msg))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div>
            <div id="vendors-header" className="page-header">
                <div className="page-header-info">
                    <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Vendors</h1>
                    <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>Manage suppliers, contractors, and service providers.</p>
                    <button type="button" onClick={startTour} style={{ marginTop: 4, padding: 0, border: 'none', background: 'none', fontSize: 'var(--font-xs)', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>Take tour</button>
                </div>
                <div className="page-header-actions">
                    <button id="vendors-add-btn" type="button" className="btn btn-primary" onClick={openAddModal} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>+ Add Vendor</button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {!loading && vendors.length > 0 && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="form-group" style={{ maxWidth: 320 }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                id="vendor-search"
                                type="text"
                                className="form-input"
                                placeholder="Search vendors"
                                value={searchQ}
                                onChange={(e) => setSearchQ(e.target.value)}
                                style={{ paddingLeft: 40 }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <p className="text-muted">Loading vendors...</p>
            ) : vendors.length === 0 ? (
                <p className="text-muted" id="vendors-cards">No vendors yet. Click + Add Vendor to create one.</p>
            ) : (
                <div id="vendors-cards" className="cards-grid cols-2" style={{ marginTop: 'var(--space-2)' }}>
                    {vendors.map((vendor) => {
                        const rating = typeof vendor.rating === 'number' ? vendor.rating : 0
                        const projects = vendor.projects_count ?? 0
                        const totalValue = vendor.total_value ?? 0
                        const relPct = vendor.reliability_pct ?? 0
                        const reliabilityColor = relPct >= 80 ? 'success' : relPct >= 50 ? '' : 'danger'
                        return (
                            <div className="vendor-card" key={vendor.id} style={{ boxShadow: 'var(--shadow-sm)' }}>
                                <div className="vendor-card-header">
                                    <div className="vendor-card-avatar">
                                        {(vendor.name || ' ').charAt(0)}
                                    </div>
                                    <div className="vendor-card-info" style={{ minWidth: 0 }}>
                                        <div className="vendor-card-name">{vendor.name}</div>
                                        <div className="vendor-card-type">{vendor.type || '—'}</div>
                                        <div className="vendor-card-rating">
                                            {Array.from({ length: 5 }).map((_, si) => (
                                                <Star
                                                    key={si}
                                                    size={14}
                                                    className={`star ${si < rating ? 'filled' : 'empty'}`}
                                                    fill={si < rating ? '#f59e0b' : 'none'}
                                                />
                                            ))}
                                            <span>{rating} stars</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button type="button" className="btn-icon" onClick={() => openEditModal(vendor)} aria-label="Edit"><Pencil size={14} /></button>
                                            <button type="button" className="btn-icon danger" onClick={() => setDeleteConfirm(vendor)} aria-label="Delete"><Trash2 size={14} /></button>
                                        </div>
                                        <span className={`badge badge-${statusToBadge(vendor.status || '')}`}>
                                            {statusToLabel(vendor.status || '')}
                                        </span>
                                    </div>
                                </div>

                                <div className="vendor-card-details">
                                    <div className="vendor-card-detail">
                                        <Phone size={14} /> {vendor.phone || '—'}
                                    </div>
                                    <div className="vendor-card-detail">
                                        <Mail size={14} /> {vendor.email || '—'}
                                    </div>
                                    <div className="vendor-card-detail">
                                        <MapPin size={14} /> {vendor.address || '—'}
                                    </div>
                                </div>

                                <div className="vendor-card-stats">
                                    <div>
                                        <div className="vendor-card-stat-value">{projects}</div>
                                        <div className="vendor-card-stat-label">Projects</div>
                                    </div>
                                    <div>
                                        <div className="vendor-card-stat-value">{totalValue}</div>
                                        <div className="vendor-card-stat-label">Total Value</div>
                                    </div>
                                    <div>
                                        <div className={`vendor-card-stat-value ${reliabilityColor}`}>
                                            {relPct.toFixed(0)}%
                                        </div>
                                        <div className="vendor-card-stat-label">Reliability</div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Add Vendor Modal — DESIGN.md: modal-overlay, modal, modal-header, modal-title, modal-subtitle, modal-close, form-row, modal-footer */}
            {addModalOpen && (
                <div className="modal-overlay" onClick={closeAddModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Add Vendor</h2>
                                <p className="modal-subtitle">Create a new supplier, contractor, or partner.</p>
                            </div>
                            <button type="button" className="modal-close" onClick={closeAddModal} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Vendor Name *</label>
                                    <input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Vendor name" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category *</label>
                                    <input className="form-input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} placeholder="Category" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Phone *</label>
                                    <input className="form-input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Phone number" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email *</label>
                                    <input type="email" className="form-input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email address" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Location *</label>
                                    <input className="form-input" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Location" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Upload Image *</label>
                                    <input type="file" id="add-vendor-image" accept="image/*" className="form-input" title="Choose file" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status *</label>
                                <select className="form-input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                                    {STATUS_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description *</label>
                                <textarea className="form-input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short description" rows={3} style={{ resize: 'vertical' }} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={closeAddModal}>Cancel</button>
                            <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={submitting}>{submitting ? 'Saving...' : 'Create Vendor'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Vendor Modal — DESIGN.md */}
            {editModalOpen && editingVendor && (
                <div className="modal-overlay" onClick={closeEditModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Edit Vendor</h2>
                                <p className="modal-subtitle">{editingVendor.name}</p>
                            </div>
                            <button type="button" className="modal-close" onClick={closeEditModal} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Vendor Name *</label>
                                    <input className="form-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Vendor name" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <input className="form-input" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} placeholder="Category" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input className="form-input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Phone number" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input type="email" className="form-input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email address" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Location</label>
                                <input className="form-input" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Location" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                                        {STATUS_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Rating (0–5)</label>
                                    <input type="number" min={0} max={5} className="form-input" value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: parseInt(e.target.value, 10) || 0 }))} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short description" rows={3} style={{ resize: 'vertical' }} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={closeEditModal}>Cancel</button>
                            <button type="button" className="btn btn-primary" onClick={handleUpdate} disabled={submitting}>{submitting ? 'Saving...' : 'Update'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation — DESIGN.md */}
            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Delete Vendor</h2>
                                <p className="modal-subtitle">This action cannot be undone.</p>
                            </div>
                            <button type="button" className="modal-close" onClick={() => setDeleteConfirm(null)} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p style={{ color: 'var(--text-secondary)' }}>Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?</p>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={submitting}>{submitting ? 'Deleting...' : 'Delete'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
