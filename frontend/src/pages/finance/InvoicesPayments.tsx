import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
    DollarSign,
    CheckCircle,
    Clock,
    AlertTriangle,
    Plus,
    Search,
    X,
    Eye,
    Download,
} from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

interface InvoiceSummary {
    total_amount: number
    paid_amount: number
    pending_amount: number
    overdue_amount: number
}

interface VendorRef {
    id: string
    name: string
}

interface ProjectRef {
    id: string
    name: string
}

interface Invoice {
    id: string
    invoice_number: string
    vendor_id: string
    project_id: string
    total_amount: number
    remaining_amount: number
    issue_date: string
    due_date: string
    payment_terms: string
    description: string
    status: string
    vendor?: VendorRef
    project?: ProjectRef
}

interface ListResponse {
    summary: InvoiceSummary
    invoices: Invoice[]
    total: number
}

const STATUS_OPTIONS = [
    { value: 'all', label: 'All Status' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
    { value: 'PAID', label: 'Paid' },
    { value: 'OVERDUE', label: 'Overdue' },
] as const

const PAYMENT_TERMS = ['Net 15', 'Net 30', 'Net 60', 'Net 90', 'Due on Receipt', 'Custom']
const PAYMENT_METHODS = [
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'CREDIT_CARD', label: 'Credit Card' },
    { value: 'CASH', label: 'Cash' },
    { value: 'OTHER', label: 'Other' },
]

function statusToBadge(status: string): string {
    const s = (status || '').toUpperCase()
    if (s === 'PAID') return 'success'
    if (s === 'OVERDUE') return 'danger'
    if (s === 'PENDING' || s === 'PARTIALLY_PAID') return 'warning'
    return 'neutral'
}

function formatDate(s: string): string {
    if (!s) return '—'
    const d = new Date(s)
    if (isNaN(d.getTime())) return s
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
}

function toISODate(s: string): string {
    if (!s) return ''
    const d = new Date(s)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
}

export default function InvoicesPayments() {
    const location = useLocation()
    const navigate = useNavigate()
    const prefillFromPR = (location.state as { purchaseRequest?: { id?: string; vendor_id?: string; project_id?: string; total_price?: number } })?.purchaseRequest

    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [summary, setSummary] = useState<InvoiceSummary | null>(null)
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [total, setTotal] = useState(0)

    const [createModalOpen, setCreateModalOpen] = useState(false)
    const [recordModalOpen, setRecordModalOpen] = useState(false)
    const [viewModalInvoice, setViewModalInvoice] = useState<Invoice | null>(null)
    const [viewDetail, setViewDetail] = useState<{
        invoice: Invoice
        payments?: { amount: number; payment_date: string; payment_method: string; reference_number: string }[]
        purchase_request?: {
            id: string
            created_at: string
            requester?: { name: string }
            items?: { material?: { name: string; unit?: string }; quantity: number; unit_price: number; total_price: number }[]
            material?: { name: string }
            quantity?: number
            unit_price?: number
            total_price?: number
        }
    } | null>(null)
    const [submitting, setSubmitting] = useState(false)

    const [vendors, setVendors] = useState<{ id: string; name: string }[]>([])
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
    const [invoicesForPayment, setInvoicesForPayment] = useState<Invoice[]>([])

    const [createForm, setCreateForm] = useState({
        vendor_id: '',
        project_id: '',
        purchase_request_id: '',
        total_amount: '0',
        issue_date: '',
        due_date: '',
        payment_terms: '',
        description: '',
    })
    const [recordForm, setRecordForm] = useState({
        invoice_id: '',
        amount: '0',
        payment_date: '',
        payment_method: 'BANK_TRANSFER',
        reference_number: '',
    })

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300)
        return () => clearTimeout(t)
    }, [search])

    const fetchInvoices = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({ limit: '50', offset: '0' })
            if (debouncedSearch) params.set('search', debouncedSearch)
            if (statusFilter !== 'all') params.set('status', statusFilter)
            const res = await api.get<{ success?: boolean; data?: ListResponse }>(`/invoices?${params}`)
            if (res.data?.success && res.data?.data) {
                const d = res.data.data
                setSummary(d.summary)
                setInvoices(d.invoices || [])
                setTotal(d.total ?? 0)
            }
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(msg || 'Failed to fetch invoices')
            setSummary(null)
            setInvoices([])
        } finally {
            setLoading(false)
        }
    }, [debouncedSearch, statusFilter])

    useEffect(() => {
        fetchInvoices()
    }, [fetchInvoices])

    // Auto-open Create Invoice modal when landing from Material Requests with pre-filled data
    useEffect(() => {
        if (prefillFromPR && !createModalOpen) {
            openCreateModal()
        }
    }, [prefillFromPR])

    const fetchOptions = useCallback(async () => {
        try {
            const [vRes, pRes, invRes] = await Promise.all([
                api.get<{ success?: boolean; data?: { id: string; name: string }[] }>('/vendors?include_inactive=true'),
                api.get<{ success?: boolean; data?: { id: string; name: string }[] }>('/projects'),
                api.get<{ success?: boolean; data?: Invoice[] }>('/invoices/for-payment'),
            ])
            if (vRes.data?.success && Array.isArray(vRes.data.data)) {
                setVendors(vRes.data.data)
            }
            if (pRes.data?.success && Array.isArray(pRes.data.data)) {
                setProjects(pRes.data.data)
            }
            if (invRes.data?.success && Array.isArray(invRes.data.data)) {
                setInvoicesForPayment(invRes.data.data)
            }
        } catch {
            // ignore
        }
    }, [])

    useEffect(() => {
        if (createModalOpen || recordModalOpen) {
            fetchOptions()
        }
    }, [createModalOpen, recordModalOpen, fetchOptions])

    // When Record Payment modal opens and invoices for payment load, pre-select first and set amount (only if user has not selected one yet)
    useEffect(() => {
        if (recordModalOpen && invoicesForPayment.length > 0 && !recordForm.invoice_id) {
            const first = invoicesForPayment[0]
            setRecordForm((f) => ({ ...f, invoice_id: first.id, amount: String(first.remaining_amount ?? 0) }))
        }
    }, [recordModalOpen, invoicesForPayment, recordForm.invoice_id])

    const openCreateModal = () => {
        const today = toISODate(new Date().toISOString())
        setCreateForm({
            vendor_id: prefillFromPR?.vendor_id || '',
            project_id: prefillFromPR?.project_id || '',
            purchase_request_id: prefillFromPR?.id || '',
            total_amount: String(prefillFromPR?.total_price ?? 0),
            issue_date: today,
            due_date: today,
            payment_terms: 'Net 30',
            description: '',
        })
        setCreateModalOpen(true)
        if (prefillFromPR) navigate('.', { replace: true, state: {} })
    }

    const closeCreateModal = () => setCreateModalOpen(false)
    const openRecordModal = () => {
        const today = toISODate(new Date().toISOString())
        setRecordForm({
            invoice_id: '',
            amount: '0',
            payment_date: today,
            payment_method: 'BANK_TRANSFER',
            reference_number: '',
        })
        setRecordModalOpen(true)
    }
    const closeRecordModal = () => setRecordModalOpen(false)

    const handleCreateInvoice = async () => {
        if (!createForm.vendor_id || !createForm.project_id || !createForm.total_amount || parseFloat(createForm.total_amount) <= 0) {
            toast.error('Vendor, Project, and Amount are required')
            return
        }
        if (!createForm.issue_date || !createForm.due_date) {
            toast.error('Issue Date and Due Date are required')
            return
        }
        setSubmitting(true)
        try {
            await api.post('/invoices', {
                vendor_id: createForm.vendor_id,
                project_id: createForm.project_id,
                purchase_request_id: createForm.purchase_request_id || undefined,
                total_amount: parseFloat(createForm.total_amount),
                issue_date: createForm.issue_date,
                due_date: createForm.due_date,
                payment_terms: createForm.payment_terms || undefined,
                description: createForm.description || undefined,
            })
            toast.success('Invoice created successfully')
            closeCreateModal()
            fetchInvoices()
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(msg || 'Failed to create invoice')
        } finally {
            setSubmitting(false)
        }
    }

    const handleRecordPayment = async () => {
        if (!recordForm.invoice_id || !recordForm.amount || parseFloat(recordForm.amount) <= 0) {
            toast.error('Invoice and Payment Amount are required')
            return
        }
        if (!recordForm.payment_date || !recordForm.payment_method || !recordForm.reference_number) {
            toast.error('Payment Date, Method, and Reference Number are required')
            return
        }
        setSubmitting(true)
        try {
            await api.post(`/invoices/${recordForm.invoice_id}/payments`, {
                amount: parseFloat(recordForm.amount),
                payment_date: recordForm.payment_date,
                payment_method: recordForm.payment_method,
                reference_number: recordForm.reference_number,
            })
            toast.success('Payment recorded successfully')
            closeRecordModal()
            fetchInvoices()
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(msg || 'Failed to record payment')
        } finally {
            setSubmitting(false)
        }
    }

    const handleViewInvoice = async (inv: Invoice) => {
        try {
            type InvoicePayment = { amount: number; payment_date: string; payment_method: string; reference_number: string }
            type PurchaseRequestDetail = {
                id: string
                created_at: string
                requester?: { name: string }
                items?: { material?: { name: string; unit?: string }; quantity: number; unit_price: number; total_price: number }[]
                material?: { name: string }
                quantity?: number
                unit_price?: number
                total_price?: number
            }

            const res = await api.get<{
                success?: boolean
                data?: Invoice & { payments?: InvoicePayment[]; purchase_request?: PurchaseRequestDetail }
            }>(`/invoices/${inv.id}`)
            if (res.data?.success && res.data?.data) {
                const d = res.data.data
                setViewDetail({ invoice: d, payments: d.payments, purchase_request: d.purchase_request })
                setViewModalInvoice(inv)
            }
        } catch {
            toast.error('Failed to load invoice details')
        }
    }

    const closeViewModal = () => {
        setViewModalInvoice(null)
        setViewDetail(null)
    }

    const handleDownloadInvoice = async (inv: Invoice) => {
        try {
            const res = await api.get(`/invoices/${inv.id}/download`, { responseType: 'blob' })
            const blob = res.data as Blob
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `invoice-${inv.invoice_number}.pdf`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            a.remove()
            toast.success('Invoice PDF downloaded')
        } catch {
            toast.error('Download failed')
        }
    }

    return (
        <div>
            <div className="page-header">
                <div className="page-header-info">
                    <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Invoices & Payments</h1>
                    <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>Manage vendor invoices and track payments</p>
                    <p style={{ margin: 'var(--space-1) 0 0', fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
                        Tip: To create an invoice from a material order, go to <strong>Inventory → Material Requests</strong>, find a request with status ORDERED or RECEIVED, and click the <strong>Create Invoice</strong> (document) icon in the row actions.
                    </p>
                </div>
                <div className="page-header-actions" style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button type="button" className="btn btn-secondary" onClick={openRecordModal} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <DollarSign size={18} /> Record Payment
                    </button>
                    <button type="button" className="btn btn-primary" onClick={openCreateModal} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Plus size={18} /> Create Invoice
                    </button>
                </div>
            </div>

            <div className="stat-cards" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                        <span className="stat-card-title">Total Amount</span>
                        <span style={{ color: 'var(--text-muted)' }}><DollarSign size={24} /></span>
                    </div>
                    <div className="stat-card-value">
                        ${(summary?.total_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                </div>
                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                        <span className="stat-card-title">Paid</span>
                        <span style={{ color: 'var(--success)' }}><CheckCircle size={24} /></span>
                    </div>
                    <div className="stat-card-value">
                        ${(summary?.paid_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                </div>
                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                        <span className="stat-card-title">Pending</span>
                        <span style={{ color: 'var(--warning)' }}><Clock size={24} /></span>
                    </div>
                    <div className="stat-card-value">
                        ${(summary?.pending_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                </div>
                <div className="stat-card">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                        <span className="stat-card-title">Overdue</span>
                        <span style={{ color: 'var(--danger)' }}><AlertTriangle size={24} /></span>
                    </div>
                    <div className="stat-card-value">
                        ${(summary?.overdue_amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                </div>
            </div>

            <div className="filter-row" style={{ marginBottom: 'var(--space-4)', display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="form-group" style={{ maxWidth: 280, flex: 1, minWidth: 180 }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search invoices..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ paddingLeft: 40 }}
                        />
                    </div>
                </div>
                <div className="form-group" style={{ width: 160 }}>
                    <select
                        className="form-input"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="content-card">
                <div className="content-card-header">
                    <div>
                        <div className="content-card-title">Invoices</div>
                        <div className="content-card-subtitle">Manage vendor invoices and payments</div>
                    </div>
                </div>
                {loading ? (
                    <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>Loading invoices...</div>
                ) : invoices.length === 0 ? (
                    <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>No invoices yet. Click Create Invoice to add one.</div>
                ) : (
                    <div className="data-table-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Invoice #</th>
                                    <th>Vendor</th>
                                    <th>Project</th>
                                    <th>Remaining Amt.</th>
                                    <th>Due Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td>{inv.invoice_number}</td>
                                        <td>{inv.vendor?.name ?? '—'}</td>
                                        <td>{inv.project?.name ?? '—'}</td>
                                        <td>${inv.remaining_amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                                        <td>{formatDate(inv.due_date)}</td>
                                        <td>
                                            <span className={`badge badge-${statusToBadge(inv.status)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                {inv.status === 'PAID' && <CheckCircle size={14} />}
                                                {inv.status === 'PENDING' || inv.status === 'OVERDUE' ? <Clock size={14} /> : null}
                                                {inv.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="actions">
                                                <button type="button" className="btn-icon" onClick={() => handleViewInvoice(inv)} aria-label="View">
                                                    <Eye size={16} />
                                                </button>
                                                <button type="button" className="btn-icon" onClick={() => handleDownloadInvoice(inv)} aria-label="Download">
                                                    <Download size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Invoice Modal */}
            {createModalOpen && (
                <div className="modal-overlay" onClick={closeCreateModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Create New Invoice</h2>
                                <p className="modal-subtitle">Create a new invoice for vendor payment.</p>
                            </div>
                            <button type="button" className="modal-close" onClick={closeCreateModal} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <div className="form-group">
                                <label className="form-label">Vendor *</label>
                                <select className="form-input" value={createForm.vendor_id} onChange={(e) => setCreateForm((f) => ({ ...f, vendor_id: e.target.value }))}>
                                    <option value="">Select vendor</option>
                                    {vendors.map((v) => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Project *</label>
                                <select className="form-input" value={createForm.project_id} onChange={(e) => setCreateForm((f) => ({ ...f, project_id: e.target.value }))}>
                                    <option value="">Select project</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Amount *</label>
                                <input type="number" min={0} step={0.01} className="form-input" value={createForm.total_amount} onChange={(e) => setCreateForm((f) => ({ ...f, total_amount: e.target.value }))} placeholder="0" />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Issue Date *</label>
                                    <input type="date" className="form-input" value={createForm.issue_date} onChange={(e) => setCreateForm((f) => ({ ...f, issue_date: e.target.value }))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Due Date *</label>
                                    <input type="date" className="form-input" value={createForm.due_date} onChange={(e) => setCreateForm((f) => ({ ...f, due_date: e.target.value }))} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Payment Terms *</label>
                                <select className="form-input" value={createForm.payment_terms} onChange={(e) => setCreateForm((f) => ({ ...f, payment_terms: e.target.value }))}>
                                    <option value="">Select terms</option>
                                    {PAYMENT_TERMS.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description</label>
                                <textarea className="form-input" value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} placeholder="Invoice description..." rows={3} style={{ resize: 'vertical' }} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={closeCreateModal}>Cancel</button>
                            <button type="button" className="btn btn-primary" onClick={handleCreateInvoice} disabled={submitting}>{submitting ? 'Creating...' : 'Create Invoice'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Record Payment Modal */}
            {recordModalOpen && (
                <div className="modal-overlay" onClick={closeRecordModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Record Payment</h2>
                                <p className="modal-subtitle">Record a payment for a vendor invoice.</p>
                            </div>
                            <button type="button" className="modal-close" onClick={closeRecordModal} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Invoice *</label>
                                <select
                                    className="form-input"
                                    value={recordForm.invoice_id}
                                    onChange={(e) => {
                                        const id = e.target.value
                                        const inv = invoicesForPayment.find((i) => i.id === id)
                                        setRecordForm((f) => ({ ...f, invoice_id: id, amount: inv ? String(inv.remaining_amount ?? 0) : f.amount }))
                                    }}
                                >
                                    <option value="">Select invoice</option>
                                    {invoicesForPayment.map((inv) => (
                                        <option key={inv.id} value={inv.id}>
                                            {inv.invoice_number} - {inv.vendor?.name} (${inv.remaining_amount.toLocaleString()})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Payment Amount *</label>
                                <input type="number" min={0} step={0.01} className="form-input" value={recordForm.amount} onChange={(e) => setRecordForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Payment Date *</label>
                                <input type="date" className="form-input" value={recordForm.payment_date} onChange={(e) => setRecordForm((f) => ({ ...f, payment_date: e.target.value }))} placeholder="dd/mm/yyyy" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Payment Method *</label>
                                <select className="form-input" value={recordForm.payment_method} onChange={(e) => setRecordForm((f) => ({ ...f, payment_method: e.target.value }))}>
                                    <option value="">Select method</option>
                                    {PAYMENT_METHODS.map((m) => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Reference Number *</label>
                                <input type="text" className="form-input" value={recordForm.reference_number} onChange={(e) => setRecordForm((f) => ({ ...f, reference_number: e.target.value }))} placeholder="Enter reference number" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={closeRecordModal}>Cancel</button>
                            <button type="button" className="btn btn-primary" onClick={handleRecordPayment} disabled={submitting}>{submitting ? 'Recording...' : 'Record Payment'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Invoice Detail Modal */}
            {viewModalInvoice && (
                <div className="modal-overlay" onClick={closeViewModal}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Invoice {viewDetail?.invoice?.invoice_number ?? viewModalInvoice.invoice_number}</h2>
                                <p className="modal-subtitle">{viewDetail?.invoice?.vendor?.name ?? viewModalInvoice.vendor?.name} · {viewDetail?.invoice?.project?.name ?? viewModalInvoice.project?.name}</p>
                            </div>
                            <button type="button" className="modal-close" onClick={closeViewModal} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
                            {viewDetail ? (
                                <>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Total Amount</label>
                                            <div style={{ fontWeight: 600 }}>${viewDetail.invoice.total_amount?.toLocaleString() ?? '—'}</div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Remaining</label>
                                            <div style={{ fontWeight: 600 }}>${viewDetail.invoice.remaining_amount?.toLocaleString() ?? '—'}</div>
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Issue Date</label>
                                            <div>{viewDetail.invoice.issue_date ? formatDate(viewDetail.invoice.issue_date) : '—'}</div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Due Date</label>
                                            <div>{viewDetail.invoice.due_date ? formatDate(viewDetail.invoice.due_date) : '—'}</div>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Status</label>
                                        <span className={`badge badge-${statusToBadge(viewDetail.invoice.status ?? '')}`}>{viewDetail.invoice.status ?? '—'}</span>
                                    </div>
                                    {viewDetail.purchase_request && ((viewDetail.purchase_request.items?.length ?? 0) > 0 || viewDetail.purchase_request.material) && (
                                        <div className="form-group">
                                            <label className="form-label">Materials (from Material Request)</label>
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
                                                        {viewDetail.purchase_request.items && viewDetail.purchase_request.items.length > 0
                                                            ? viewDetail.purchase_request.items.map((item, i) => (
                                                                <tr key={i}>
                                                                    <td>{item.material?.name ?? '—'}</td>
                                                                    <td>{item.quantity}</td>
                                                                    <td>{item.material?.unit ?? '—'}</td>
                                                                    <td>${(item.unit_price ?? 0).toLocaleString()}</td>
                                                                    <td style={{ fontWeight: 600 }}>${(item.total_price ?? 0).toLocaleString()}</td>
                                                                </tr>
                                                              ))
                                                            : (
                                                                <tr>
                                                                    <td>{viewDetail.purchase_request.material?.name ?? '—'}</td>
                                                                    <td>{viewDetail.purchase_request.quantity ?? '—'}</td>
                                                                    <td>—</td>
                                                                    <td>${(viewDetail.purchase_request.unit_price ?? 0).toLocaleString()}</td>
                                                                    <td style={{ fontWeight: 600 }}>${(viewDetail.purchase_request.total_price ?? 0).toLocaleString()}</td>
                                                                </tr>
                                                              )}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div style={{ marginTop: 8, fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
                                                Request ID: {viewDetail.purchase_request.id?.slice(0, 8)}... · Requested: {viewDetail.purchase_request.created_at ? formatDate(viewDetail.purchase_request.created_at) : '—'}
                                                {viewDetail.purchase_request.requester?.name && ` · By: ${viewDetail.purchase_request.requester.name}`}
                                            </div>
                                        </div>
                                    )}
                                    {viewDetail.invoice.description && (
                                        <div className="form-group">
                                            <label className="form-label">Description</label>
                                            <div style={{ whiteSpace: 'pre-wrap' }}>{viewDetail.invoice.description}</div>
                                        </div>
                                    )}
                                    {viewDetail.payments && viewDetail.payments.length > 0 && (
                                        <div className="form-group">
                                            <label className="form-label">Payments</label>
                                            <div className="data-table-wrapper">
                                                <table className="data-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Date</th>
                                                            <th>Amount</th>
                                                            <th>Method</th>
                                                            <th>Reference</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {viewDetail.payments.map((p, i) => (
                                                            <tr key={i}>
                                                                <td>{formatDate(p.payment_date)}</td>
                                                                <td>${p.amount?.toLocaleString()}</td>
                                                                <td>{p.payment_method?.replace('_', ' ')}</td>
                                                                <td>{p.reference_number}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--text-muted)' }}>Loading invoice details…</div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={closeViewModal}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
