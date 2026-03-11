import { useEffect, useMemo, useState } from 'react'
import { Eye, Package, Pencil, Plus, ShoppingCart, Trash2, X } from 'lucide-react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

const POLL_INTERVAL_MS = 30_000
const MATERIAL_UNITS = ['KG', 'TON', 'BAG', 'PIECE', 'LITRE', 'CFT', 'SQFT', 'OTHER']

interface Material {
    id: string
    name: string
    unit: string
    current_stock: number
    min_stock: number
    project_id: string
    project?: { id: string; name: string }
}

interface ProjectOption {
    id: string
    name: string
}

interface RecentOrder {
    order_id: string
    supplier: string
    order_date: string
    items: number
    status: string
    expected_delivery?: string
    project_name: string
    total_value: number
}

interface PurchaseRequestLite {
    id: string
    project?: { id: string; name: string }
    material?: { name: string }
    vendor?: { id: string; name: string }
    total_price: number
}

export default function StockLevels() {
    const [projects, setProjects] = useState<ProjectOption[]>([])
    const [materials, setMaterials] = useState<Material[]>([])
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const [showAddMaterialModal, setShowAddMaterialModal] = useState(false)
    const [showCreateOrderModal, setShowCreateOrderModal] = useState(false)
    const [showStockAdjustModal, setShowStockAdjustModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [approvedRequests, setApprovedRequests] = useState<PurchaseRequestLite[]>([])
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
    const [newMaterial, setNewMaterial] = useState({
        name: '',
        unit: 'KG',
        min_stock: '',
        project_id: '',
    })
    const [orderForm, setOrderForm] = useState({
        request_id: '',
    })
    const [stockForm, setStockForm] = useState({
        mode: 'IN',
        quantity: '',
        reason: '',
    })

    const fetchProjects = async () => {
        try {
            const res = await api.get('/projects')
            if (res.data?.success && Array.isArray(res.data.data)) {
                setProjects(res.data.data.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })))
            }
        } catch {
            // Keep page usable.
        }
    }

    const fetchAllMaterials = async (isInitial = true) => {
        try {
            if (isInitial) setLoading(true)
            const projectsRes = await api.get('/projects')
            if (!projectsRes.data?.success || !Array.isArray(projectsRes.data.data)) {
                setMaterials([])
                return
            }
            const projects = projectsRes.data.data as { id: string; name: string }[]
            const all: Material[] = []
            for (const p of projects) {
                try {
                    const res = await api.get(`/inventory/materials?project_id=${p.id}`)
                    const list = Array.isArray(res.data?.data) ? res.data.data : []
                    all.push(...list.map((m: Material) => ({ ...m, project: m.project || { id: p.id, name: p.name } })))
                } catch {
                    // skip project if materials fetch fails
                }
            }
            setMaterials(all)
            setLastUpdated(new Date())
        } catch (err) {
            console.error('Failed to fetch materials', err)
            setMaterials([])
        } finally {
            if (isInitial) setLoading(false)
        }
    }

    const fetchRecentOrders = async () => {
        try {
            const res = await api.get('/procurement/orders/recent?limit=10')
            if (res.data?.success && Array.isArray(res.data.data)) {
                setRecentOrders(res.data.data)
            } else {
                setRecentOrders([])
            }
        } catch {
            setRecentOrders([])
        }
    }

    useEffect(() => {
        fetchProjects()
        fetchAllMaterials(true)
        fetchRecentOrders()
        const interval = setInterval(() => fetchAllMaterials(false), POLL_INTERVAL_MS)
        const ordersInterval = setInterval(() => fetchRecentOrders(), POLL_INTERVAL_MS)
        return () => {
            clearInterval(interval)
            clearInterval(ordersInterval)
        }
    }, [])

    const lowStockCount = materials.filter((m) => m.min_stock > 0 && m.current_stock <= m.min_stock).length
    const inStockCount = materials.length - lowStockCount
    const totalMaterials = materials.length
    const selectedApprovedRequest = useMemo(
        () => approvedRequests.find((r) => r.id === orderForm.request_id) || null,
        [approvedRequests, orderForm.request_id]
    )

    const orderStatusBadge = (status: string) => {
        const s = status?.toUpperCase()
        if (s === 'ORDERED') return 'info'
        if (s === 'RECEIVED') return 'success'
        if (s === 'REJECTED') return 'danger'
        return 'warning'
    }

    const openCreateOrderModal = async () => {
        setShowCreateOrderModal(true)
        setOrderForm({ request_id: '' })
        try {
            const res = await api.get('/procurement/requests/all?status=APPROVED')
            if (res.data?.success && Array.isArray(res.data.data)) {
                setApprovedRequests(res.data.data)
            } else {
                setApprovedRequests([])
            }
        } catch {
            setApprovedRequests([])
            toast.error('Failed to load approved requests.')
        }
    }

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!orderForm.request_id) {
            toast.error('Please select an approved request.')
            return
        }
        setSubmitting(true)
        try {
            await api.patch(`/procurement/requests/${orderForm.request_id}/status`, {
                status: 'ORDERED',
            })
            toast.success('Order created from approved request.')
            setShowCreateOrderModal(false)
            fetchRecentOrders()
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to create order.')
        } finally {
            setSubmitting(false)
        }
    }

    const handleAddMaterial = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMaterial.project_id) {
            toast.error('Select a project.')
            return
        }
        setSubmitting(true)
        try {
            await api.post('/inventory/materials', {
                name: newMaterial.name,
                unit: newMaterial.unit,
                min_stock: Number(newMaterial.min_stock || 0),
                project_id: newMaterial.project_id,
            })
            toast.success('Material added.')
            setShowAddMaterialModal(false)
            setNewMaterial({ name: '', unit: 'KG', min_stock: '', project_id: '' })
            fetchAllMaterials()
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to add material.')
        } finally {
            setSubmitting(false)
        }
    }

    const openStockAdjustModal = (material: Material) => {
        setSelectedMaterial(material)
        setStockForm({ mode: 'IN', quantity: '', reason: '' })
        setShowStockAdjustModal(true)
    }

    const handleStockAdjust = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedMaterial) return
        const qty = Number(stockForm.quantity)
        if (!qty || qty <= 0) {
            toast.error('Quantity must be greater than zero.')
            return
        }
        setSubmitting(true)
        try {
            if (stockForm.mode === 'IN') {
                await api.post('/inventory/stock-in', {
                    material_id: selectedMaterial.id,
                    project_id: selectedMaterial.project_id,
                    quantity: qty,
                    reason: stockForm.reason || 'Manual stock in',
                })
            } else {
                await api.post('/inventory/stock-out', {
                    material_id: selectedMaterial.id,
                    project_id: selectedMaterial.project_id,
                    quantity: qty,
                    reason: stockForm.reason || 'Manual stock out',
                })
            }
            toast.success(`Stock ${stockForm.mode === 'IN' ? 'added' : 'removed'} successfully.`)
            setShowStockAdjustModal(false)
            fetchAllMaterials()
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to adjust stock.')
        } finally {
            setSubmitting(false)
        }
    }

    const startTour = () => {
        const driverObj = driver({
            showProgress: true,
            steps: [
                { element: '#inventory-stock-header', popover: { title: 'Inventory', description: 'Track material stock and manage procurement here. Use "Take tour" anytime to see these tips again. Click Close or press Escape to skip.' } },
                { element: '#inventory-create-order-btn', popover: { title: 'Create Order', description: 'Convert an approved material request into a purchase order.' } },
                { element: '#inventory-add-material-btn', popover: { title: 'Add Material', description: 'Add a new material to a project with name, unit, and minimum stock level.' } },
                { element: '#inventory-stat-cards', popover: { title: 'Stock summary', description: 'Total materials across projects, low-stock count, and items above minimum.' } },
                { element: '#inventory-materials-grid', popover: { title: 'Material cards', description: 'Each card shows stock level, min stock, and status. Use the icons to adjust stock or manage alerts.' } },
                { element: '#inventory-recent-orders', popover: { title: 'Recent Orders', description: 'Track recent purchase orders and deliveries. Use the links to view or manage requests in Material Requests.' } },
            ],
            onDestroyed: () => {
                try { localStorage.setItem('inventory-stock-tour-done', 'true'); } catch { /* ignore */ }
            },
        })
        driverObj.drive()
    }

    if (loading && materials.length === 0) {
        return (
            <div>
                <div className="page-header">
                    <div className="page-header-info">
                        <h1>Inventory</h1>
                        <p>Loading…</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div id="inventory-stock-header" className="page-header">
                <div className="page-header-info">
                    <h1>Inventory</h1>
                    <p>Track material stock and manage procurement</p>
                </div>
                <div className="page-header-actions">
                    <button type="button" className="btn btn-secondary" onClick={startTour} title="Take a guided tour">
                        Take tour
                    </button>
                    <button id="inventory-create-order-btn" type="button" className="btn btn-secondary" onClick={openCreateOrderModal}>
                        <ShoppingCart size={16} />
                        Create Order
                    </button>
                    <button id="inventory-add-material-btn" type="button" className="btn btn-primary" onClick={() => setShowAddMaterialModal(true)}>
                        <Plus size={16} />
                        Add Material
                    </button>
                </div>
                {lastUpdated && (
                    <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
                        Updated {lastUpdated.toLocaleTimeString()}
                    </span>
                )}
            </div>

            <div id="inventory-stat-cards" className="stat-cards" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <span className="stat-card-title">Total materials</span>
                        <span className="stat-card-icon"><Package size={20} /></span>
                    </div>
                    <div className="stat-card-value">{totalMaterials}</div>
                    <div className="stat-card-subtitle info">Across all projects</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <span className="stat-card-title">Low stock</span>
                        <span className="stat-card-icon"><Package size={20} /></span>
                    </div>
                    <div className="stat-card-value">{lowStockCount}</div>
                    <div className={`stat-card-subtitle ${lowStockCount > 0 ? 'negative' : 'positive'}`}>
                        Need restock
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-header">
                        <span className="stat-card-title">In stock</span>
                        <span className="stat-card-icon"><Package size={20} /></span>
                    </div>
                    <div className="stat-card-value">{inStockCount}</div>
                    <div className="stat-card-subtitle positive">Above minimum</div>
                </div>
            </div>

            <div id="inventory-materials-grid" className="cards-grid cols-2">
                {materials.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No materials found. Add materials to projects to see stock levels.
                    </div>
                ) : (
                    materials.map((material) => {
                        const isLow = material.min_stock > 0 && material.current_stock <= material.min_stock
                        const fillPercent = material.min_stock > 0
                            ? Math.min((material.current_stock / Math.max(material.min_stock * 2, material.min_stock + 1)) * 100, 100)
                            : 100
                        return (
                            <div className="material-card" key={material.id}>
                                <div className="material-card-header">
                                    <div>
                                        <div className="material-card-name">{material.name}</div>
                                        <div className="material-card-category">{material.project?.name || material.project_id}</div>
                                    </div>
                                    <div className="actions">
                                        <button className="btn-icon" title="Adjust Stock" onClick={() => openStockAdjustModal(material)}><Pencil size={14} /></button>
                                        <button className="btn-icon danger" title="Low stock alert">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div style={{ margin: 'var(--space-2) 0' }}>
                                    <span className={`badge badge-${isLow ? 'danger' : 'success'}`}>
                                        {isLow ? '⚠ Low Stock' : '✓ Available'}
                                    </span>
                                </div>

                                <div className="material-card-stock">
                                    <div className="material-card-stock-header">
                                        <span className="material-card-stock-label">Stock Level</span>
                                        <span className="material-card-stock-value">
                                            {material.current_stock.toLocaleString()} {material.unit}
                                        </span>
                                    </div>
                                    <div className="progress-bar">
                                        <div
                                            className={`progress-bar-fill ${isLow ? 'warning' : ''}`}
                                            style={{
                                                width: `${fillPercent}%`,
                                                backgroundColor: isLow ? 'var(--danger-color)' : undefined,
                                            }}
                                        />
                                    </div>
                                    <div className="material-card-stock-range">
                                        <span>Min: {material.min_stock} {material.unit}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <div id="inventory-recent-orders" className="content-card" style={{ marginTop: 'var(--space-6)' }}>
                <div className="content-card-header">
                    <div>
                        <div className="content-card-title">Recent Orders</div>
                        <div className="content-card-subtitle">Track recent orders and deliveries</div>
                    </div>
                </div>
                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Supplier</th>
                                <th>Order Date</th>
                                <th>Items</th>
                                <th>Status</th>
                                <th>Expected Delivery</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                        No recent orders.
                                    </td>
                                </tr>
                            ) : (
                                recentOrders.map((o) => (
                                    <tr key={o.order_id}>
                                        <td style={{ fontWeight: 500 }}>PO-{o.order_id.slice(0, 8)}</td>
                                        <td>{o.supplier || 'Unassigned'}</td>
                                        <td>{o.order_date ? new Date(o.order_date).toLocaleDateString() : '—'}</td>
                                        <td>{o.items}</td>
                                        <td><span className={`badge badge-${orderStatusBadge(o.status)}`}>{o.status}</span></td>
                                        <td>{o.expected_delivery ? new Date(o.expected_delivery).toLocaleDateString() : '—'}</td>
                                        <td>
                                            <div className="actions">
                                                <Link to="/inventory/material-requests" className="btn-icon" title="View request">
                                                    <Eye size={14} />
                                                </Link>
                                                <Link to="/inventory/material-requests" className="btn-icon" title="Manage request">
                                                    <Pencil size={14} />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAddMaterialModal && (
                <div className="modal-overlay" onClick={() => !submitting && setShowAddMaterialModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Add Material</h2>
                                <p className="modal-subtitle">Create a new stock item for a project</p>
                            </div>
                            <button className="modal-close" onClick={() => setShowAddMaterialModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleAddMaterial}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Project</label>
                                        <select className="form-input" value={newMaterial.project_id} onChange={(e) => setNewMaterial((prev) => ({ ...prev, project_id: e.target.value }))} required>
                                            <option value="">Select project</option>
                                            {projects.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Material name</label>
                                        <input className="form-input" value={newMaterial.name} onChange={(e) => setNewMaterial((prev) => ({ ...prev, name: e.target.value }))} required />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Unit</label>
                                        <select className="form-input" value={newMaterial.unit} onChange={(e) => setNewMaterial((prev) => ({ ...prev, unit: e.target.value }))}>
                                            {MATERIAL_UNITS.map((unit) => (
                                                <option key={unit} value={unit}>{unit}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Min stock</label>
                                        <input className="form-input" type="number" min="0" step="0.01" value={newMaterial.min_stock} onChange={(e) => setNewMaterial((prev) => ({ ...prev, min_stock: e.target.value }))} />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddMaterialModal(false)} disabled={submitting}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving…' : 'Add Material'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showCreateOrderModal && (
                <div className="modal-overlay" onClick={() => !submitting && setShowCreateOrderModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Create Order</h2>
                                <p className="modal-subtitle">Convert an approved material request into an order</p>
                            </div>
                            <button className="modal-close" onClick={() => setShowCreateOrderModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateOrder}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Approved request</label>
                                    <select className="form-input" value={orderForm.request_id} onChange={(e) => setOrderForm({ request_id: e.target.value })} required>
                                        <option value="">Select approved request</option>
                                        {approvedRequests.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {r.id.slice(0, 8)}... - {r.project?.name || 'Project'} - {r.material?.name || 'Material'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {selectedApprovedRequest && (
                                    <div className="content-card" style={{ padding: 'var(--space-4)' }}>
                                        <div className="content-card-subtitle">Supplier: {selectedApprovedRequest.vendor?.name || 'Unassigned'}</div>
                                        <div className="content-card-subtitle">Estimated Value: ${Number(selectedApprovedRequest.total_price || 0).toLocaleString()}</div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateOrderModal(false)} disabled={submitting}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create Order'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showStockAdjustModal && selectedMaterial && (
                <div className="modal-overlay" onClick={() => !submitting && setShowStockAdjustModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Adjust Stock</h2>
                                <p className="modal-subtitle">{selectedMaterial.name} ({selectedMaterial.project?.name || selectedMaterial.project_id})</p>
                            </div>
                            <button className="modal-close" onClick={() => setShowStockAdjustModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleStockAdjust}>
                            <div className="modal-body">
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Type</label>
                                        <select className="form-input" value={stockForm.mode} onChange={(e) => setStockForm((prev) => ({ ...prev, mode: e.target.value }))}>
                                            <option value="IN">Stock In</option>
                                            <option value="OUT">Stock Out</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Quantity</label>
                                        <input className="form-input" type="number" min="0.01" step="0.01" value={stockForm.quantity} onChange={(e) => setStockForm((prev) => ({ ...prev, quantity: e.target.value }))} required />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Reason</label>
                                    <input className="form-input" value={stockForm.reason} onChange={(e) => setStockForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder={stockForm.mode === 'IN' ? 'Purchase/return/adjustment' : 'Usage/damage/adjustment'} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowStockAdjustModal(false)} disabled={submitting}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving…' : 'Apply'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
