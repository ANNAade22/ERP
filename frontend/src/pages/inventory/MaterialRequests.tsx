import { Eye, Pencil, Clock, CheckCircle, CircleCheck } from 'lucide-react'

const stats = [
    { value: '5', label: 'Pending', icon: <Clock size={20} />, color: 'var(--warning)' },
    { value: '3', label: 'Approved', icon: <CheckCircle size={20} />, color: 'var(--info)' },
    { value: '2', label: 'Fulfilled', icon: <CircleCheck size={20} />, color: 'var(--success)' },
    { value: '$23,558', label: 'Total Value', icon: null, color: 'var(--text-primary)' },
]

const requests = [
    { id: 'MR-69403766', site: 'rgsg', requestedBy: 'aaaaaaaaasa', date: '2/21/2026', urgency: 'High', urgencyBadge: 'danger', value: '$250', status: 'Pending', statusBadge: 'warning' },
    { id: 'MR-46778662', site: 'kebun sawit', requestedBy: 'Mohs', date: '1/31/2026', urgency: 'Urgent', urgencyBadge: 'danger', value: '$25', status: 'Approved', statusBadge: 'success' },
    { id: 'MR-58171579', site: 'Painting of Restaurant', requestedBy: 'asd', date: '1/27/2026', urgency: 'Medium', urgencyBadge: 'warning', value: '$50', status: 'Pending', statusBadge: 'warning' },
    { id: 'MR-98331891', site: 'Zad Corp', requestedBy: 'mohit', date: '1/20/2026', urgency: 'High', urgencyBadge: 'danger', value: '$5,350', status: 'Approved', statusBadge: 'success' },
    { id: 'MR-29176498', site: 'kebun sawit', requestedBy: 'budi', date: '1/17/2026', urgency: 'High', urgencyBadge: 'danger', value: '$1,000', status: 'Pending', statusBadge: 'warning' },
    { id: 'MR-92616654', site: 'ABC', requestedBy: 'xyz', date: '1/13/2026', urgency: 'Low', urgencyBadge: 'neutral', value: '$640', status: 'Pending', statusBadge: 'warning' },
]

export default function MaterialRequests() {
    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-info">
                    <h1>Material Requests (MRN)</h1>
                    <p>Automated material request management system</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-primary">+ Create Request</button>
                </div>
            </div>

            {/* Stat Cards */}
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

            {/* Filter Row */}
            <div className="filter-row">
                <input
                    className="filter-input"
                    type="text"
                    placeholder="Search by request number, site, or requester..."
                />
                <select className="filter-select">
                    <option>All Status</option>
                    <option>Pending</option>
                    <option>Approved</option>
                    <option>Fulfilled</option>
                </select>
            </div>

            {/* Data Table */}
            <div className="content-card">
                <div className="content-card-header">
                    <div>
                        <div className="content-card-title">Material Requests</div>
                        <div className="content-card-subtitle">Track and manage all material requests</div>
                    </div>
                </div>

                <div className="data-table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Request #</th>
                                <th>Site</th>
                                <th>Requested By</th>
                                <th>Date</th>
                                <th>Urgency</th>
                                <th>Value</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.map((req, i) => (
                                <tr key={i}>
                                    <td style={{ fontWeight: 500 }}>{req.id}</td>
                                    <td>{req.site}</td>
                                    <td>{req.requestedBy}</td>
                                    <td>{req.date}</td>
                                    <td>
                                        <span className={`badge badge-${req.urgencyBadge}`}>{req.urgency}</span>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{req.value}</td>
                                    <td>
                                        <span className={`badge badge-${req.statusBadge}`}>
                                            {req.status === 'Approved' ? '✓ ' : '⏳ '}{req.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="actions">
                                            <button className="btn-icon"><Eye size={16} /></button>
                                            <button className="btn-icon"><Pencil size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
