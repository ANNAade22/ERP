import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    Building2,
    DollarSign,
    TrendingUp,
    Users,
    Package,
    AlertTriangle,
    ArrowRight,
} from 'lucide-react'
import api from '../utils/api'

interface DashboardData {
    overview: {
        total_projects: number
        active_projects: number
        total_budget: number
        total_spent: number
        budget_remaining: number
        budget_utilization: number
    }
    project_summaries: {
        id: string
        name: string
        status: string
        budget: number
        spent_amount: number
        remaining: number
        percent_used: number
    }[]
    attendance_summaries: {
        project_id: string
        project_name: string
        total_workers: number
        present_today: number
        absent_today: number
        attendance_rate: number
    }[]
    low_stock_alerts: {
        id: string
        name: string
        unit: string
        current_stock: number
        min_stock: number
        project_name: string
    }[]
    procurement: {
        pending_requests: number
        approved_requests: number
        total_purchase_value: number
    }
}

export default function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const response = await api.get('/dashboard')
                if (response.data.success) {
                    setData(response.data.data)
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data', error)
            } finally {
                setLoading(false)
            }
        }
        fetchDashboard()
    }, [])

    if (loading) {
        return <div style={{ padding: '2rem' }}>Loading dashboard...</div>
    }

    if (!data || !data.overview) {
        return <div style={{ padding: '2rem', color: 'var(--danger-color)' }}>Failed to load dashboard data.</div>
    }

    const overview = data.overview
    const project_summaries = data.project_summaries || []
    const low_stock_alerts = data.low_stock_alerts || []
    const attendance_summaries = data.attendance_summaries || []
    const procurement = data.procurement || { pending_requests: 0, approved_requests: 0, total_purchase_value: 0 }

    // Calculate labor attendance average
    const avgAttendance = attendance_summaries.length > 0
        ? attendance_summaries.reduce((acc, curr) => acc + curr.attendance_rate, 0) / attendance_summaries.length
        : 0;

    const stats = [
        {
            title: 'Active Projects',
            value: overview.active_projects.toString(),
            subtitle: `${overview.total_projects} total projects`,
            subtitleType: 'info',
            icon: <Building2 size={20} />
        },
        {
            title: 'Budget Utilization',
            value: `${overview.budget_utilization.toFixed(1)}%`,
            subtitle: `$${overview.total_spent.toLocaleString()} / $${overview.total_budget.toLocaleString()}`,
            subtitleType: overview.budget_utilization > 90 ? 'negative' : 'positive',
            icon: <DollarSign size={20} />
        },
        {
            title: 'Procurement Requests',
            value: procurement.pending_requests.toString(),
            subtitle: `${procurement.approved_requests} approved`,
            subtitleType: procurement.pending_requests > 5 ? 'warning' : 'neutral',
            icon: <TrendingUp size={20} />
        },
        {
            title: 'Labor Attendance',
            value: `${avgAttendance.toFixed(1)}%`,
            subtitle: 'Today across all active sites',
            subtitleType: avgAttendance > 90 ? 'positive' : 'warning',
            icon: <Users size={20} />
        },
        {
            title: 'Material Stock',
            value: low_stock_alerts.length.toString(),
            subtitle: 'Items low in stock',
            subtitleType: low_stock_alerts.length > 0 ? 'negative' : 'positive',
            icon: <Package size={20} />
        },
        {
            title: 'Total Expenses',
            value: `$${overview.total_spent.toLocaleString()}`,
            subtitle: 'All time',
            subtitleType: 'info',
            icon: <AlertTriangle size={20} />
        },
    ]

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-info">
                    <h1>Dashboard</h1>
                    <p>Welcome back! Here's what's happening with your projects today.</p>
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

            {/* Active Projects */}
            <div className="content-card">
                <div className="content-card-header">
                    <div>
                        <div className="content-card-title">Projects Overview</div>
                        <div className="content-card-subtitle">Financial and progress overview of projects</div>
                    </div>
                    <Link to="/projects" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        View all projects <ArrowRight size={16} />
                    </Link>
                </div>

                {project_summaries.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        No projects found.
                    </div>
                ) : (
                    project_summaries.map((project) => (
                        <div className="active-project" key={project.id}>
                            <div className="active-project-header">
                                <div>
                                    <Link to={`/projects/${project.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                        <div className="active-project-name">{project.name}</div>
                                    </Link>
                                </div>
                                <div className="active-project-budget">
                                    <span className={`badge badge-${project.status === 'COMPLETED' ? 'success' : project.status === 'ON_HOLD' ? 'warning' : 'info'}`}>
                                        {project.status.replace('_', ' ')}
                                    </span>
                                    <div className="active-project-budget-value">${project.budget.toLocaleString()}</div>
                                </div>
                            </div>

                            <div className="active-project-meta">
                                <span className="active-project-meta-item">
                                    Spent: ${project.spent_amount.toLocaleString()}
                                </span>
                                <span className="active-project-meta-item">
                                    Remaining: ${project.remaining.toLocaleString()}
                                </span>
                            </div>

                            <div className="active-project-progress">
                                <span className="active-project-progress-label">Budget Used</span>
                                <div className="progress-bar" style={{ flex: 1 }}>
                                    <div
                                        className="progress-bar-fill"
                                        style={{
                                            width: `${Math.min(project.percent_used, 100)}%`,
                                            backgroundColor: project.percent_used > 90 ? 'var(--danger-color)' : project.percent_used > 75 ? 'var(--warning-color)' : 'var(--primary-color)'
                                        }}
                                    />
                                </div>
                                <span className="active-project-progress-value">{project.percent_used.toFixed(1)}%</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
