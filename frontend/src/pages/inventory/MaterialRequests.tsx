import { useEffect, useMemo, useState } from 'react'
import {
    CheckCircle,
    CircleCheck,
    Clock,
    Eye,
    PackageCheck,
    Pencil,
    Plus,
    Truck,
    X,
    XCircle,
} from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

const POLL_INTERVAL_MS = 30_000
const STATUS_OPTIONS = ['PENDING', 'APPROVED', 'REJECTED', 'ORDERED', 'RECEIVED'] as const

interface PurchaseRequest {
    id: string
    project_id: string
    project?: { id: string; name: string }
    material_id?: string
    vendor_id?: string
    material?: { name: string; unit?: string }
    items?: Array<{
        id: string
        material_id: string
        material?: { name: string; unit?: string }
        quantity: number
        unit_price: number
        total_price: number
    }>
    quantity: number
    unit_price: number
    total_price: number
    status: string
    notes?: string
    requested_by: string
    requester?: { name?: string; email?: string }
    created_at: string
    updated_at?: string
}

interface ProjectOption {
    id: string
    name: string
}

interface VendorOption {
    id: string
    name: string
}

interface MaterialOption {
    id: string
    name: string
    unit: string
}

interface RequestFormState {
    project_id: string
    urgency: string
    vendor_id: string
    items: RequestItemForm[]
    notes: string
}

interface RequestItemForm {
    material_id: string
    quantity: string
    unit_price: string
}

const INITIAL_FORM: RequestFormState = {
    project_id: '',
    urgency: '',
    vendor_id: '',
    items: [{ material_id: '', quantity: '', unit_price: '' }],
    notes: '',
}

function getRequestItems(request: PurchaseRequest) {
    if (request.items && request.items.length > 0) return request.items
    return [{
        id: `legacy-${request.id}`,
        material_id: request.material_id || '',
        material: request.material,
        quantity: request.quantity || 0,
        unit_price: request.unit_price || 0,
        total_price: request.total_price || 0,
    }]
}

function mapRequestToForm(request: PurchaseRequest): RequestFormState {
    const items = getRequestItems(request).map((it) => ({
        material_id: it.material_id,
        quantity: (it.quantity || 0).toString(),
        unit_price: (it.unit_price || 0).toString(),
    }))
    return {
        project_id: request.project_id,
        urgency: '',
        vendor_id: request.vendor_id || '',
        items: items.length > 0 ? items : [{ material_id: '', quantity: '', unit_price: '' }],
        notes: request.notes || '',
    }
}

function statusBadge(status: string) {
    const s = (status || '').toUpperCase()
    if (s === 'PENDING') return 'warning'
    if (s === 'APPROVED' || s === 'ORDERED') return 'info'
    if (s === 'RECEIVED') return 'success'
    if (s === 'REJECTED') return 'danger'
    return 'neutral'
}

function canCreate(role?: string) {
    return role === 'ADMIN' || role === 'SITE_ENGINEER' || role === 'STORE_OFFICER'
}

function canApprove(role?: string) {
    return role === 'ADMIN' || role === 'PROJECT_MANAGER'
}

function canOrder(role?: string) {
    return role === 'ADMIN' || role === 'STORE_OFFICER'
}

function getAllowedStatusActions(role: string | undefined, currentStatus: string) {
    const s = (currentStatus || '').toUpperCase()
    if (s === 'PENDING' && canApprove(role)) return ['APPROVED', 'REJECTED']
    if (s === 'APPROVED' && canOrder(role)) return ['ORDERED']
    if (s === 'ORDERED' && canOrder(role)) return ['RECEIVED']
    return [] as string[]
}

export default function MaterialRequests() {
    const { user } = useAuth()
    const [requests, setRequests] = useState<PurchaseRequest[]>([])
    const [projects, setProjects] = useState<ProjectOption[]>([])
    const [vendors, setVendors] = useState<VendorOption[]>([])
    const [materialsByProject, setMaterialsByProject] = useState<Record<string, MaterialOption[]>>({})
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('All')
    const [projectFilter, setProjectFilter] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const [rowLoadingId, setRowLoadingId] = useState<string | null>(null)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showViewModal, setShowViewModal] = useState(false)
    const [showStatusModal, setShowStatusModal] = useState(false)
    const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null)
    const [targetStatus, setTargetStatus] = useState('')
    const [form, setForm] = useState<RequestFormState>(INITIAL_FORM)
    const [submitting, setSubmitting] = useState(false)
    const formItemsTotal = useMemo(
        () =>
            form.items.reduce((sum, item) => {
                const qty = Number(item.quantity || 0)
                const price = Number(item.unit_price || 0)
                return sum + qty * price
            }, 0),
        [form.items]
    )

    const fetchProjectsAndVendors = async () => {
        try {
            const [projectsRes, vendorsRes] = await Promise.all([
                api.get('/projects'),
                api.get('/vendors'),
            ])
            if (projectsRes.data?.success && Array.isArray(projectsRes.data.data)) {
                setProjects(projectsRes.data.data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })))
            }
            if (vendorsRes.data?.success && Array.isArray(vendorsRes.data.data)) {
                setVendors(vendorsRes.data.data.map((v: { id: string; name: string }) => ({ id: v.id, name: v.name })))
            }
        } catch {
            // Keep page usable even if references fail.
        }
    }

    const fetchMaterialsForProject = async (projectId: string) => {
        if (!projectId || materialsByProject[projectId]) return
        try {
            const res = await api.get(`/inventory/materials?project_id=${projectId}`)
            if (res.data?.success && Array.isArray(res.data.data)) {
                setMaterialsByProject((prev) => ({
                    ...prev,
                    [projectId]: res.data.data.map((m: { id: string; name: string; unit: string }) => ({
                        id: m.id,
                        name: m.name,
                        unit: m.unit,
                    })),
                }))
            }
        } catch {
            setMaterialsByProject((prev) => ({ ...prev, [projectId]: [] }))
        }
    }

    const fetchAllRequests = async (isInitial = true) => {
        try {
            if (isInitial) setLoading(true)
            const params: string[] = []
            if (projectFilter) params.push(`project_id=${encodeURIComponent(projectFilter)}`)
            if (statusFilter !== 'All') params.push(`status=${encodeURIComponent(statusFilter)}`)
            if (searchQuery.trim()) params.push(`search=${encodeURIComponent(searchQuery.trim())}`)
            const query = params.length ? `?${params.join('&')}` : ''
            const res = await api.get(`/procurement/requests/all${query}`)
            if (res.data?.success && Array.isArray(res.data.data)) {
                setRequests(res.data.data)
            } else {
                setRequests([])
            }
            setLastUpdated(new Date())
        } catch (err) {
            console.error('Failed to fetch material requests', err)
            if (isInitial) toast.error('Failed to load material requests.')
            setRequests([])
        } finally {
            if (isInitial) setLoading(false)
        }
    }

    useEffect(() => {
        fetchProjectsAndVendors()
        fetchAllRequests(true)
        const interval = setInterval(() => fetchAllRequests(false), POLL_INTERVAL_MS)
        return () => clearInterval(interval)
    }, [statusFilter, projectFilter, searchQuery])

    const openCreate = () => {
        setForm(INITIAL_FORM)
        setShowCreateModal(true)
    }

    const openView = (req: PurchaseRequest) => {
        setSelectedRequest(req)
        setShowViewModal(true)
    }

    const openEdit = async (req: PurchaseRequest) => {
        if (req.status !== 'PENDING') {
            toast.error('Only pending requests can be edited.')
            return
        }
        await fetchMaterialsForProject(req.project_id)
        setSelectedRequest(req)
        setForm(mapRequestToForm(req))
        setShowEditModal(true)
    }

    const openStatusAction = (req: PurchaseRequest, nextStatus: string) => {
        setSelectedRequest(req)
        setTargetStatus(nextStatus)
        setShowStatusModal(true)
    }

    const onFormProjectChange = async (projectId: string) => {
        setForm((prev) => ({
            ...prev,
            project_id: projectId,
            items: prev.items.map((item) => ({ ...item, material_id: '' })),
        }))
        await fetchMaterialsForProject(projectId)
    }

    const updateFormItem = (index: number, patch: Partial<RequestItemForm>) => {
        setForm((prev) => ({
            ...prev,
            items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
        }))
    }

    const addFormItem = () => {
        setForm((prev) => ({
            ...prev,
            items: [...prev.items, { material_id: '', quantity: '', unit_price: '' }],
        }))
    }

    const removeFormItem = (index: number) => {
        setForm((prev) => {
            if (prev.items.length <= 1) return prev
            return {
                ...prev,
                items: prev.items.filter((_, i) => i !== index),
            }
        })
    }

    const createRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!canCreate(user?.role)) {
            toast.error('You do not have permission to create requests.')
            return
        }
        const payloadItems = form.items
            .map((item) => ({
                material_id: item.material_id,
                quantity: Number(item.quantity || 0),
                unit_price: Number(item.unit_price || 0),
            }))
            .filter((item) => item.material_id && item.quantity > 0 && item.unit_price >= 0)
        if (payloadItems.length === 0) {
            toast.error('Add at least one valid material item.')
            return
        }
        setSubmitting(true)
        try {
            await api.post('/procurement/requests', {
                project_id: form.project_id,
                vendor_id: form.vendor_id || undefined,
                items: payloadItems,
                notes: [form.urgency ? `Urgency: ${form.urgency}` : '', form.notes].filter(Boolean).join('\n'),
            })
            toast.success('Request created.')
            setShowCreateModal(false)
            setForm(INITIAL_FORM)
            fetchAllRequests()
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to create request.')
        } finally {
            setSubmitting(false)
        }
    }

    const saveEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedRequest) return
        const payloadItems = form.items
            .map((item) => ({
                material_id: item.material_id,
                quantity: Number(item.quantity || 0),
                unit_price: Number(item.unit_price || 0),
            }))
            .filter((item) => item.material_id && item.quantity > 0 && item.unit_price >= 0)
        if (payloadItems.length === 0) {
            toast.error('Add at least one valid material item.')
            return
        }
        setSubmitting(true)
        try {
            await api.patch(`/procurement/requests/${selectedRequest.id}`, {
                items: payloadItems,
                vendor_id: form.vendor_id || '',
                notes: form.notes,
            })
            toast.success('Request updated.')
            setShowEditModal(false)
            setSelectedRequest(null)
            fetchAllRequests()
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to update request.')
        } finally {
            setSubmitting(false)
        }
    }

    const confirmStatusAction = async () => {
        if (!selectedRequest || !targetStatus) return
        setRowLoadingId(selectedRequest.id)
        try {
            await api.patch(`/procurement/requests/${selectedRequest.id}/status`, {
                status: targetStatus,
            })
            toast.success(`Status updated to ${targetStatus}.`)
            setShowStatusModal(false)
            setSelectedRequest(null)
            setTargetStatus('')
            fetchAllRequests()
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to update status.')
        } finally {
            setRowLoadingId(null)
        }
    }

    const pending = requests.filter((r) => r.status === 'PENDING').length
    const approved = requests.filter((r) => r.status === 'APPROVED' || r.status === 'ORDERED').length
    const received = requests.filter((r) => r.status === 'RECEIVED').length
    const totalValue = requests
        .filter((r) => ['APPROVED', 'ORDERED', 'RECEIVED'].includes(r.status))
        .reduce((acc, r) => acc + (r.total_price || 0), 0)

    const rows = useMemo(() => requests, [requests])

    const stats = [
        { value: pending.toString(), label: 'Pending', icon: <Clock size={20} />, color: 'var(--warning)' },
        { value: approved.toString(), label: 'Approved', icon: <CheckCircle size={20} />, color: 'var(--info)' },
        { value: received.toString(), label: 'Fulfilled', icon: <CircleCheck size={20} />, color: 'var(--success)' },
        { value: `$${totalValue.toLocaleString()}`, label: 'Total Value', icon: null, color: 'var(--text-primary)' },
    ]

    if (loading && requests.length === 0) {
        return (
            <div>
                <div className="page-header">
                    <div className="page-header-info">
                        <h1>Material Requests (MRN)</h1>
                        <p>Loading…</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className="page-header">
                <div className="page-header-info">
                    <h1>Material Requests (MRN)</h1>
                    <p>Automated material request management system</p>
                </div>
                {canCreate(user?.role) && (
                    <div className="page-header-actions">
                        <button className="btn btn-primary" onClick={openCreate}>
                            <Plus size={16} />
                            Create Request
                        </button>
                    </div>
                )}
                {lastUpdated && (
                    <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
                        Updated {lastUpdated.toLocaleTimeString()}
                    </span>
                )}
            </div>

            <div className="stat-cards">
                {stats.map((stat, i) => (
                    <div className="stat-card" key={i}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {stat.icon && <span style={{ color: stat.color }}>{stat.icon}</span>}
                            <div>
                                <div className="stat-card-value" style={{ color: stat.color }}>{stat.value}</div>
                                <div className="stat-card-subtitle neutral">{stat.label}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="filter-row">
                <input
                    className="filter-input"
                    type="text"
                    placeholder="Search by request ID, site, or requester..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select
                    className="filter-select"
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                >
                    <option value="">All Sites</option>
                    {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="All">All Status</option>
                    {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
            </div>

            <div className="content-card">
                <div className="content-card-header">
                    <div>
                        <div className="content-card-title">Material Requests</div>
                        <div className="content-card-subtitle">Track and manage procurement requests</div>
                    </div>
                </div>

                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Request ID</th>
                                <th>Site</th>
                                <th>Material</th>
                                <th>Requested By</th>
                                <th>Date</th>
                                <th>Value</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                        No requests found.
                                    </td>
                                </tr>
                            ) : (
                                rows.map((req) => {
                                    const actions = getAllowedStatusActions(user?.role, req.status)
                                    const busy = rowLoadingId === req.id
                                    const reqItems = getRequestItems(req)
                                    const primaryMaterial = reqItems[0]?.material?.name || req.material?.name || req.material_id || '—'
                                    const materialLabel = reqItems.length > 1
                                        ? `${primaryMaterial} +${reqItems.length - 1} more`
                                        : primaryMaterial
                                    return (
                                    <tr key={req.id}>
                                        <td style={{ fontWeight: 500 }}>{req.id.slice(0, 8)}…</td>
                                        <td>{req.project?.name || req.project_id}</td>
                                        <td>{materialLabel}</td>
                                        <td>{req.requester?.name || req.requester?.email || req.requested_by}</td>
                                        <td>{req.created_at ? new Date(req.created_at).toLocaleDateString() : '—'}</td>
                                        <td style={{ fontWeight: 600 }}>${(req.total_price || 0).toLocaleString()}</td>
                                        <td>
                                            <span className={`badge badge-${statusBadge(req.status)}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="actions">
                                                <button className="btn-icon" title="View" onClick={() => openView(req)}>
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    className="btn-icon"
                                                    title="Edit"
                                                    onClick={() => openEdit(req)}
                                                    disabled={req.status !== 'PENDING'}
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                {actions.map((nextStatus) => (
                                                    <button
                                                        key={`${req.id}-${nextStatus}`}
                                                        className="btn-icon"
                                                        title={nextStatus}
                                                        disabled={busy}
                                                        onClick={() => openStatusAction(req, nextStatus)}
                                                    >
                                                        {nextStatus === 'APPROVED' && <CheckCircle size={16} />}
                                                        {nextStatus === 'REJECTED' && <XCircle size={16} />}
                                                        {nextStatus === 'ORDERED' && <Truck size={16} />}
                                                        {nextStatus === 'RECEIVED' && <PackageCheck size={16} />}
                                                    </button>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                )})
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showCreateModal && (
                <div className="modal-overlay" onClick={() => !submitting && setShowCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '860px' }}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Create Material Request</h2>
                                <p className="modal-subtitle">Create a new material request for a construction site.</p>
                            </div>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={createRequest}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Site *</label>
                                        <select className="form-input" value={form.project_id} onChange={(e) => onFormProjectChange(e.target.value)} required>
                                            <option value="">Select site</option>
                                            {projects.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Urgency *</label>
                                        <select className="form-input" value={form.urgency} onChange={(e) => setForm((prev) => ({ ...prev, urgency: e.target.value }))} required>
                                            <option value="">Select urgency</option>
                                            <option value="LOW">Low</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="HIGH">High</option>
                                            <option value="URGENT">Urgent</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Requested By *</label>
                                    <input
                                        className="form-input"
                                        value={`${user?.email || 'Current User'}${user?.role ? ` (${user.role})` : ''}`}
                                        disabled
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Materials *</label>
                                    <div className="content-card" style={{ padding: 'var(--space-4)' }}>
                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                                                gap: 'var(--space-3)',
                                                marginBottom: 'var(--space-3)',
                                                color: 'var(--text-secondary)',
                                                fontWeight: 600,
                                                fontSize: 'var(--font-sm)',
                                            }}
                                        >
                                            <span>Material</span>
                                            <span>Quantity</span>
                                            <span>Unit</span>
                                            <span>Unit Price</span>
                                            <span>Total</span>
                                        </div>
                                        {form.items.map((item, index) => {
                                            const materialOption = (materialsByProject[form.project_id] || []).find((m) => m.id === item.material_id)
                                            return (
                                                <div
                                                    key={`create-item-${index}`}
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
                                                        gap: 'var(--space-3)',
                                                        marginBottom: 'var(--space-3)',
                                                    }}
                                                >
                                                    <select
                                                        className="form-input"
                                                        value={item.material_id}
                                                        onChange={(e) => updateFormItem(index, { material_id: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">Select</option>
                                                        {(materialsByProject[form.project_id] || []).map((m) => (
                                                            <option key={m.id} value={m.id}>{m.name}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        className="form-input"
                                                        type="number"
                                                        min="0.01"
                                                        step="0.01"
                                                        value={item.quantity}
                                                        onChange={(e) => updateFormItem(index, { quantity: e.target.value })}
                                                        required
                                                    />
                                                    <input className="form-input" value={materialOption?.unit || 'Unit'} disabled />
                                                    <input
                                                        className="form-input"
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={item.unit_price}
                                                        onChange={(e) => updateFormItem(index, { unit_price: e.target.value })}
                                                    />
                                                    <input
                                                        className="form-input"
                                                        value={(Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)}
                                                        disabled
                                                    />
                                                    <button
                                                        type="button"
                                                        className="btn-icon"
                                                        title="Remove material"
                                                        disabled={form.items.length === 1}
                                                        onClick={() => removeFormItem(index)}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            )
                                        })}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)' }}>
                                            <button type="button" className="btn btn-secondary" onClick={addFormItem}>
                                                + Add Material
                                            </button>
                                            <strong style={{ color: 'var(--text-primary)' }}>Total: ${formItemsTotal.toFixed(2)}</strong>
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Vendor (optional)</label>
                                    <select className="form-input" value={form.vendor_id} onChange={(e) => setForm((prev) => ({ ...prev, vendor_id: e.target.value }))}>
                                        <option value="">Unassigned</option>
                                        {vendors.map((v) => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Additional Notes</label>
                                    <textarea className="form-input" rows={4} placeholder="Any special requirements or notes..." value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)} disabled={submitting}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create Request'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditModal && selectedRequest && (
                <div className="modal-overlay" onClick={() => !submitting && setShowEditModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Edit request</h2>
                                <p className="modal-subtitle">Update pending request details</p>
                            </div>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={saveEdit}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Project</label>
                                        <input className="form-input" value={selectedRequest.project?.name || selectedRequest.project_id} disabled />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Materials</label>
                                    <div className="content-card" style={{ padding: 'var(--space-4)' }}>
                                        {form.items.map((item, index) => {
                                            const materialOption = (materialsByProject[form.project_id] || []).find((m) => m.id === item.material_id)
                                            return (
                                                <div
                                                    key={`edit-item-${index}`}
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
                                                        gap: 'var(--space-3)',
                                                        marginBottom: 'var(--space-3)',
                                                    }}
                                                >
                                                    <select
                                                        className="form-input"
                                                        value={item.material_id}
                                                        onChange={(e) => updateFormItem(index, { material_id: e.target.value })}
                                                        required
                                                    >
                                                        <option value="">Select material</option>
                                                        {(materialsByProject[form.project_id] || []).map((m) => (
                                                            <option key={m.id} value={m.id}>{m.name}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        className="form-input"
                                                        type="number"
                                                        min="0.01"
                                                        step="0.01"
                                                        value={item.quantity}
                                                        onChange={(e) => updateFormItem(index, { quantity: e.target.value })}
                                                        required
                                                    />
                                                    <input className="form-input" value={materialOption?.unit || 'Unit'} disabled />
                                                    <input
                                                        className="form-input"
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={item.unit_price}
                                                        onChange={(e) => updateFormItem(index, { unit_price: e.target.value })}
                                                    />
                                                    <input
                                                        className="form-input"
                                                        value={(Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)}
                                                        disabled
                                                    />
                                                    <button
                                                        type="button"
                                                        className="btn-icon"
                                                        title="Remove material"
                                                        disabled={form.items.length === 1}
                                                        onClick={() => removeFormItem(index)}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            )
                                        })}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <button type="button" className="btn btn-secondary" onClick={addFormItem}>+ Add Material</button>
                                            <strong style={{ color: 'var(--text-primary)' }}>Estimated Total: ${formItemsTotal.toFixed(2)}</strong>
                                        </div>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Vendor</label>
                                    <select className="form-input" value={form.vendor_id} onChange={(e) => setForm((prev) => ({ ...prev, vendor_id: e.target.value }))}>
                                        <option value="">Unassigned</option>
                                        {vendors.map((v) => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Notes</label>
                                    <textarea className="form-input" rows={3} value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)} disabled={submitting}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving…' : 'Save Changes'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showViewModal && selectedRequest && (
                <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Request details</h2>
                                <p className="modal-subtitle">{selectedRequest.id}</p>
                            </div>
                            <button className="modal-close" onClick={() => setShowViewModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {(() => {
                                const reqItems = getRequestItems(selectedRequest)
                                return (
                                    <>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Project</label>
                                    <input className="form-input" value={selectedRequest.project?.name || selectedRequest.project_id} disabled />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Requester</label>
                                    <input className="form-input" value={selectedRequest.requester?.name || selectedRequest.requester?.email || selectedRequest.requested_by} disabled />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <input className="form-input" value={selectedRequest.status} disabled />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Materials</label>
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Material</th>
                                                <th>Qty</th>
                                                <th>Unit</th>
                                                <th>Unit Price</th>
                                                <th>Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reqItems.map((item) => (
                                                <tr key={item.id}>
                                                    <td>{item.material?.name || item.material_id}</td>
                                                    <td>{item.quantity}</td>
                                                    <td>{item.material?.unit || '—'}</td>
                                                    <td>${(item.unit_price || 0).toLocaleString()}</td>
                                                    <td style={{ fontWeight: 600 }}>${(item.total_price || 0).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-input" rows={3} value={selectedRequest.notes || '—'} disabled />
                            </div>
                                    </>
                                )
                            })()}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {showStatusModal && selectedRequest && (
                <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Confirm status change</h2>
                                <p className="modal-subtitle">
                                    {selectedRequest.id.slice(0, 8)}…: {selectedRequest.status}{' -> '}{targetStatus}
                                </p>
                            </div>
                            <button className="modal-close" onClick={() => setShowStatusModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <p style={{ color: 'var(--text-secondary)' }}>
                                This action updates the procurement workflow and is logged against your role permissions.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={confirmStatusAction}>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
