import {
    Wrench,
    CheckCircle,
    AlertTriangle,
    MapPin,
    Calendar,
    Pencil,
    Trash2,
    CalendarDays,
    Clock,
    User,
} from 'lucide-react'

const stats = [
    { title: 'Total Equipment', value: '2', subtitle: '+5 new units', subtitleType: 'positive', icon: <Wrench size={20} /> },
    { title: 'Available', value: '1', subtitle: '70% utilization', subtitleType: 'neutral', icon: <CheckCircle size={20} /> },
    { title: 'Under Maintenance', value: '1', subtitle: 'Scheduled repairs', subtitleType: 'neutral', icon: <Wrench size={20} /> },
    { title: 'Critical Alerts', value: '3', subtitle: 'Needs attention', subtitleType: 'negative', icon: <AlertTriangle size={20} /> },
]

const equipment = [
    {
        name: 'JCB-2',
        type: 'Road Equipment',
        id: 'EQP-59408576',
        status: 'MAINTENANCE',
        statusType: 'warning',
        location: 'Vijay Nagar Indore (M.P.)',
        lastService: '2/12/2026',
    },
    {
        name: 'JCB',
        type: 'Delivery Vehicle',
        id: 'EQP-66410922',
        status: 'ACTIVE',
        statusType: 'success',
        location: 'Near Apna sweets Vijay Nagar Indore 452001',
        lastService: '1/17/2026',
    },
]

const upcomingMaintenance = [
    { name: 'JCB-2', type: 'Repair', assignedTo: 'lisa-brown', date: '2026-02-27', hours: '8 hours' },
    { name: 'JCB-2', type: 'Repair', assignedTo: 'lisa-brown', date: '2026-02-27', hours: '8 hours' },
    { name: 'JCB-2', type: 'Repair', assignedTo: 'lisa-brown', date: '2026-02-27', hours: '8 hours' },
]

export default function Equipment() {
    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-info">
                    <h1>Equipment Management</h1>
                    <p>Track machinery, vehicles, and maintenance schedules</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-secondary">
                        <TrendingUp size={16} /> Utilization Report
                    </button>
                    <button className="btn btn-primary">
                        + Add Equipment
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="stat-cards">
                {stats.map((stat) => (
                    <div className="stat-card" key={stat.title}>
                        <div className="stat-card-header">
                            <span className="stat-card-title">{stat.title}</span>
                            <span className="stat-card-icon">{stat.icon}</span>
                        </div>
                        <div className="stat-card-value">{stat.value}</div>
                        <div className={`stat-card-subtitle ${stat.subtitleType}`}>
                            {stat.subtitle}
                        </div>
                    </div>
                ))}
            </div>

            {/* Equipment Fleet + Upcoming Maintenance */}
            <div className="cards-grid cols-2">
                {/* Equipment Fleet */}
                <div className="content-card">
                    <div className="content-card-header">
                        <div>
                            <div className="content-card-title">⚙️ Equipment Fleet</div>
                        </div>
                    </div>

                    {equipment.map((eq, i) => (
                        <div className="equipment-card" key={i} style={{ marginBottom: 'var(--space-4)' }}>
                            <div className="equipment-card-header">
                                <div>
                                    <div className="equipment-card-name">{eq.name}</div>
                                    <div className="equipment-card-type">{eq.type} • ID: {eq.id}</div>
                                </div>
                                <div className="equipment-card-actions">
                                    <button className="btn-icon"><Pencil size={16} /></button>
                                    <button className="btn-icon danger"><Trash2 size={16} /></button>
                                </div>
                            </div>
                            <div style={{ margin: 'var(--space-2) 0' }}>
                                <span className={`badge badge-${eq.statusType}`}>{eq.status}</span>
                            </div>
                            <div className="equipment-card-details">
                                <div className="equipment-card-detail">
                                    <MapPin size={14} /> {eq.location}
                                </div>
                                <div className="equipment-card-detail">
                                    <Calendar size={14} /> Last Service: {eq.lastService}
                                </div>
                            </div>
                            <div className="equipment-card-footer">
                                <button className="btn btn-secondary" style={{ height: '34px', fontSize: '0.8125rem' }}>
                                    <CalendarDays size={14} /> Schedule
                                </button>
                                <button className="btn btn-secondary" style={{ height: '34px', fontSize: '0.8125rem' }}>
                                    <Wrench size={14} /> Maintain
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Upcoming Maintenance */}
                <div className="content-card">
                    <div className="content-card-header">
                        <div>
                            <div className="content-card-title">🔧 Upcoming Maintenance</div>
                        </div>
                    </div>

                    {upcomingMaintenance.map((m, i) => (
                        <div className="maintenance-card" key={i}>
                            <div className="maintenance-card-header">
                                <div className="maintenance-card-name">{m.name}</div>
                                <div className="maintenance-card-date">
                                    <CalendarDays size={14} /> {m.date}
                                </div>
                            </div>
                            <div className="maintenance-card-info">{m.type}</div>
                            <div className="maintenance-card-meta">
                                <span className="maintenance-card-meta-item">
                                    <User size={12} /> {m.assignedTo}
                                </span>
                                <span className="maintenance-card-meta-item">
                                    <Clock size={12} /> {m.hours}
                                </span>
                            </div>
                            <div className="maintenance-card-actions">
                                <button className="btn btn-secondary" style={{ height: '32px', fontSize: '0.8125rem' }}>
                                    Reschedule
                                </button>
                                <button className="btn btn-primary" style={{ height: '32px', fontSize: '0.8125rem' }}>
                                    Activate
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// Needed for the Utilization Report button icon
function TrendingUp({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
        </svg>
    )
}
