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
    ClipboardList,
    Truck,
    Wrench,
} from 'lucide-react'
import api, { apiBaseURL } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

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
    equipment?: {
        total_equipment: number
        available: number
        under_maintenance: number
    }
    vendors?: {
        total: number
        active: number
        preferred: number
    }
    expense_breakdown?: { category: string; total: number }[]
}

type Role = 'ADMIN' | 'PROJECT_MANAGER' | 'SITE_ENGINEER' | 'ACCOUNTANT' | 'STORE_OFFICER'

type StatItem = {
    title: string
    value: string
    subtitle: string
    subtitleType: string
    icon: React.ReactNode
    to?: string
    id?: string
}

function StatCard({ stat }: { stat: StatItem }) {
    const content = (
        <>
            <div className="stat-card-header">
                <span className="stat-card-title">{stat.title}</span>
                <span className="stat-card-icon">{stat.icon}</span>
            </div>
            <div className="stat-card-value">{stat.value}</div>
            <div className={`stat-card-subtitle ${stat.subtitleType}`}>{stat.subtitle}</div>
        </>
    )
    const commonProps = { id: stat.id, className: 'stat-card', style: stat.to ? { textDecoration: 'none', color: 'inherit' } : undefined }
    if (stat.to) {
        return (
            <Link to={stat.to} {...commonProps}>
                {content}
            </Link>
        )
    }
    return <div {...commonProps}>{content}</div>
}

// --- Admin: full overview
function AdminDashboard({ data }: { data: DashboardData }) {
    const { overview, project_summaries, attendance_summaries, low_stock_alerts, procurement, equipment, vendors } = data
    const avgAttendance =
        attendance_summaries.length > 0
            ? attendance_summaries.reduce((acc, curr) => acc + curr.attendance_rate, 0) / attendance_summaries.length
            : 0

    const equipmentSubtitle = equipment ? `${equipment.available} available, ${equipment.under_maintenance} in maintenance` : 'Fleet overview'
    const stats = [
        { title: 'Active Projects', value: overview.active_projects.toString(), subtitle: `${overview.total_projects} total projects`, subtitleType: 'info' as const, icon: <Building2 size={20} />, to: '/projects', id: 'dashboard-stat-active-projects' },
        { title: 'Budget Utilization', value: `${overview.budget_utilization.toFixed(1)}%`, subtitle: `$${overview.total_spent.toLocaleString()} / $${overview.total_budget.toLocaleString()}`, subtitleType: overview.budget_utilization > 90 ? 'negative' : 'positive', icon: <DollarSign size={20} />, to: '/finance/budget-tracker', id: 'dashboard-stat-budget-utilization' },
        { title: 'Equipment', value: equipment ? equipment.total_equipment.toString() : '0', subtitle: equipmentSubtitle, subtitleType: 'info' as const, icon: <Wrench size={20} />, to: '/equipment', id: 'dashboard-stat-equipment' },
        { title: 'Procurement Requests', value: procurement.pending_requests.toString(), subtitle: `${procurement.approved_requests} approved`, subtitleType: procurement.pending_requests > 5 ? 'warning' : 'neutral', icon: <TrendingUp size={20} />, to: '/inventory/material-requests', id: 'dashboard-stat-procurement' },
        { title: 'Labor Attendance', value: `${avgAttendance.toFixed(1)}%`, subtitle: 'Today across all sites', subtitleType: avgAttendance > 90 ? 'positive' : 'warning', icon: <Users size={20} />, to: '/attendance', id: 'dashboard-stat-attendance' },
        { title: 'Material Stock', value: low_stock_alerts.length.toString(), subtitle: 'Items low in stock', subtitleType: low_stock_alerts.length > 0 ? 'negative' : 'positive', icon: <Package size={20} />, to: '/inventory/stock-levels', id: 'dashboard-stat-material-stock' },
        { title: 'Total Expenses', value: `$${overview.total_spent.toLocaleString()}`, subtitle: 'All time', subtitleType: 'info' as const, icon: <AlertTriangle size={20} />, to: '/finance/budget-tracker', id: 'dashboard-stat-total-expenses' },
        { title: 'Vendors', value: vendors ? vendors.total.toString() : '0', subtitle: vendors ? `${vendors.active} active, ${vendors.preferred} preferred` : 'Suppliers & contractors', subtitleType: 'info' as const, icon: <Truck size={20} />, to: '/vendors/contractors', id: 'dashboard-stat-vendors' },
    ]

    return (
        <>
            <div id="dashboard-stat-cards" className="stat-cards">
                {stats.map((stat) => (
                    <StatCard key={stat.title} stat={stat} />
                ))}
            </div>
            <ProjectsOverviewSection project_summaries={project_summaries} />
        </>
    )
}

// --- Project Manager: projects, budget, procurement, attendance
function ProjectManagerDashboard({ data }: { data: DashboardData }) {
    const { overview, project_summaries, attendance_summaries, procurement, equipment } = data
    const avgAttendance =
        attendance_summaries.length > 0
            ? attendance_summaries.reduce((acc, curr) => acc + curr.attendance_rate, 0) / attendance_summaries.length
            : 0

    const equipmentSubtitle = equipment ? `${equipment.available} available` : 'Fleet'
    const stats: StatItem[] = [
        { title: 'Active Projects', value: overview.active_projects.toString(), subtitle: `${overview.total_projects} total`, subtitleType: 'info', icon: <Building2 size={20} />, to: '/projects', id: 'dashboard-stat-active-projects' },
        { title: 'Budget Utilization', value: `${overview.budget_utilization.toFixed(1)}%`, subtitle: `$${overview.total_spent.toLocaleString()} spent`, subtitleType: overview.budget_utilization > 90 ? 'negative' : 'positive', icon: <DollarSign size={20} />, to: '/finance/budget-tracker', id: 'dashboard-stat-budget-utilization' },
        { title: 'Equipment', value: equipment ? equipment.total_equipment.toString() : '0', subtitle: equipmentSubtitle, subtitleType: 'info', icon: <Wrench size={20} />, to: '/equipment', id: 'dashboard-stat-equipment' },
        { title: 'Pending Approvals', value: procurement.pending_requests.toString(), subtitle: 'Procurement requests', subtitleType: procurement.pending_requests > 5 ? 'warning' : 'neutral', icon: <TrendingUp size={20} />, to: '/inventory/material-requests', id: 'dashboard-stat-pending-approvals' },
        { title: 'Site Attendance', value: `${avgAttendance.toFixed(1)}%`, subtitle: 'Today', subtitleType: avgAttendance > 90 ? 'positive' : 'warning', icon: <Users size={20} />, to: '/attendance', id: 'dashboard-stat-site-attendance' },
    ]

    return (
        <>
            <div id="dashboard-stat-cards" className="stat-cards">
                {stats.map((stat) => (
                    <StatCard key={stat.title} stat={stat} />
                ))}
            </div>
            <ProjectsOverviewSection project_summaries={project_summaries} />
        </>
    )
}

// --- Site Engineer: my workspace — projects, today's attendance, quick actions
function SiteEngineerDashboard({ data }: { data: DashboardData }) {
    const { project_summaries, attendance_summaries, procurement } = data

    const stats: StatItem[] = [
        { title: 'My Projects', value: project_summaries.filter((p) => p.status === 'IN_PROGRESS').length.toString(), subtitle: 'Active sites', subtitleType: 'info', icon: <Building2 size={20} />, to: '/projects', id: 'dashboard-stat-my-projects' },
        { title: "Today's Attendance", value: attendance_summaries.reduce((acc, a) => acc + a.present_today, 0).toString(), subtitle: 'Workers present', subtitleType: 'info', icon: <Users size={20} />, to: '/attendance', id: 'dashboard-stat-todays-attendance' },
        { title: 'My Requests', value: procurement.pending_requests.toString(), subtitle: 'Pending procurement', subtitleType: 'info', icon: <ClipboardList size={20} />, to: '/inventory/material-requests', id: 'dashboard-stat-my-requests' },
    ]

    return (
        <>
            <div id="dashboard-stat-cards" className="stat-cards">
                {stats.map((stat) => (
                    <StatCard key={stat.title} stat={stat} />
                ))}
            </div>

            <div className="content-card">
                <div className="content-card-header">
                    <div>
                        <div className="content-card-title">Quick actions</div>
                        <div className="content-card-subtitle">Common tasks for your sites</div>
                    </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '0.5rem 0' }}>
                    <Link to="/projects" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building2 size={18} /> View projects
                    </Link>
                    <Link to="/projects/gantt-milestones" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ClipboardList size={18} /> Gantt & milestones
                    </Link>
                    <Link to="/inventory/material-requests" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Package size={18} /> Material requests
                    </Link>
                </div>
            </div>

            {attendance_summaries.length > 0 && (
                <div className="content-card">
                    <div className="content-card-header">
                        <div>
                            <div className="content-card-title">Today's attendance by site</div>
                            <div className="content-card-subtitle">Present workers per project</div>
                        </div>
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {attendance_summaries.map((a) => (
                            <li key={a.project_id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>{a.project_name}</span>
                                    <span><strong>{a.present_today}</strong> / {a.total_workers} ({a.attendance_rate.toFixed(0)}%)</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <ProjectsOverviewSection project_summaries={project_summaries} compact />
        </>
    )
}

// --- Accountant: expenses, budget, finance
function AccountantDashboard({ data }: { data: DashboardData }) {
    const { overview, project_summaries, expense_breakdown = [] } = data

    const stats: StatItem[] = [
        { title: 'Total Spent', value: `$${overview.total_spent.toLocaleString()}`, subtitle: 'All projects', subtitleType: 'info', icon: <DollarSign size={20} />, to: '/finance/budget-tracker', id: 'dashboard-stat-total-spent' },
        { title: 'Budget utilization', value: `${overview.budget_utilization.toFixed(1)}%`, subtitle: `$${overview.total_budget.toLocaleString()} total budget`, subtitleType: 'info', icon: <TrendingUp size={20} />, to: '/finance/budget-tracker', id: 'dashboard-stat-budget-utilization' },
        { title: 'Remaining', value: `$${overview.budget_remaining.toLocaleString()}`, subtitle: `Across ${overview.total_projects} projects`, subtitleType: 'info', icon: <DollarSign size={20} />, to: '/finance/budget-tracker', id: 'dashboard-stat-remaining' },
    ]

    return (
        <>
            <div id="dashboard-stat-cards" className="stat-cards">
                {stats.map((stat) => (
                    <StatCard key={stat.title} stat={stat} />
                ))}
            </div>

            {expense_breakdown.length > 0 && (
                <div className="content-card">
                    <div className="content-card-header">
                        <div>
                            <div className="content-card-title">Expenses by category</div>
                            <div className="content-card-subtitle">Approved expenses breakdown</div>
                        </div>
                        <Link to="/finance/budget-tracker" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            Budget tracker <ArrowRight size={16} />
                        </Link>
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {expense_breakdown.map((e) => (
                            <li key={e.category} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{e.category}</span>
                                <strong>${e.total.toLocaleString()}</strong>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <ProjectsOverviewSection project_summaries={project_summaries} />
        </>
    )
}

// --- Store Officer: inventory, procurement
function StoreOfficerDashboard({ data }: { data: DashboardData }) {
    const { low_stock_alerts, procurement } = data

    const stats: StatItem[] = [
        { title: 'Low stock items', value: low_stock_alerts.length.toString(), subtitle: 'Need restock', subtitleType: low_stock_alerts.length > 0 ? 'negative' : 'positive', icon: <Package size={20} />, to: '/inventory/stock-levels', id: 'dashboard-stat-low-stock' },
        { title: 'Pending requests', value: procurement.pending_requests.toString(), subtitle: 'To process', subtitleType: 'info', icon: <ClipboardList size={20} />, to: '/inventory/material-requests', id: 'dashboard-stat-pending-requests' },
        { title: 'Purchase value', value: `$${procurement.total_purchase_value.toLocaleString()}`, subtitle: 'Approved / ordered', subtitleType: 'info', icon: <DollarSign size={20} />, to: '/inventory/material-requests', id: 'dashboard-stat-purchase-value' },
    ]

    return (
        <>
            <div id="dashboard-stat-cards" className="stat-cards">
                {stats.map((stat) => (
                    <StatCard key={stat.title} stat={stat} />
                ))}
            </div>

            {low_stock_alerts.length > 0 && (
                <div className="content-card">
                    <div className="content-card-header">
                        <div>
                            <div className="content-card-title">Low stock alerts</div>
                            <div className="content-card-subtitle">Materials at or below minimum</div>
                        </div>
                        <Link to="/inventory/stock-levels" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            Stock levels <ArrowRight size={16} />
                        </Link>
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {low_stock_alerts.slice(0, 10).map((m) => (
                            <li key={m.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <strong>{m.name}</strong>
                                    <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{m.project_name}</span>
                                </div>
                                <span className="badge badge-warning">{m.current_stock} / {m.min_stock} {m.unit}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="content-card">
                <div className="content-card-header">
                    <div>
                        <div className="content-card-title">Quick links</div>
                        <div className="content-card-subtitle">Inventory & procurement</div>
                    </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '0.5rem 0' }}>
                    <Link to="/inventory/stock-levels" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Package size={18} /> Stock levels
                    </Link>
                    <Link to="/inventory/material-requests" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ClipboardList size={18} /> Material requests
                    </Link>
                    <Link to="/vendors/contractors" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Truck size={18} /> Vendors
                    </Link>
                </div>
            </div>
        </>
    )
}

// --- Shared: projects list
function ProjectsOverviewSection({
    project_summaries,
    compact = false,
}: {
    project_summaries: DashboardData['project_summaries']
    compact?: boolean
}) {
    return (
        <div className="content-card">
            <div className="content-card-header">
                <div>
                    <div className="content-card-title">{compact ? 'Projects' : 'Projects overview'}</div>
                    <div className="content-card-subtitle">
                        {compact ? 'Your projects' : 'Financial and progress overview'}
                    </div>
                </div>
                <Link to="/projects" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    View all <ArrowRight size={16} />
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
                            <span className="active-project-meta-item">Spent: ${project.spent_amount.toLocaleString()}</span>
                            <span className="active-project-meta-item">Remaining: ${project.remaining.toLocaleString()}</span>
                        </div>
                        <div className="active-project-progress">
                            <span className="active-project-progress-label">Budget used</span>
                            <div className="progress-bar" style={{ flex: 1 }}>
                                <div
                                    className="progress-bar-fill"
                                    style={{
                                        width: `${Math.min(project.percent_used, 100)}%`,
                                        backgroundColor:
                                            project.percent_used > 90 ? 'var(--danger-color)' : project.percent_used > 75 ? 'var(--warning-color)' : 'var(--primary-color)',
                                    }}
                                />
                            </div>
                            <span className="active-project-progress-value">{project.percent_used.toFixed(1)}%</span>
                        </div>
                    </div>
                ))
            )}
        </div>
    )
}

// --- Role config: title and subtitle per role
const ROLE_DASHBOARD_CONFIG: Record<Role, { title: string; subtitle: string }> = {
    ADMIN: {
        title: 'Dashboard',
        subtitle: "Welcome back! Here's the full overview of projects, budget, and operations.",
    },
    PROJECT_MANAGER: {
        title: 'Project Manager Dashboard',
        subtitle: 'Projects, budget utilization, and team attendance at a glance.',
    },
    SITE_ENGINEER: {
        title: 'My workspace',
        subtitle: 'Your sites, today’s attendance, and quick actions.',
    },
    ACCOUNTANT: {
        title: 'Finance dashboard',
        subtitle: 'Expenses, budget utilization, and financial overview.',
    },
    STORE_OFFICER: {
        title: 'Inventory & procurement',
        subtitle: 'Stock levels, low-stock alerts, and purchase requests.',
    },
}

// --- Tour: which stat card IDs each role has (in order), and step content per card
const ROLE_STAT_IDS: Record<Role, string[]> = {
    ADMIN: ['active-projects', 'budget-utilization', 'equipment', 'procurement', 'attendance', 'material-stock', 'total-expenses'],
    PROJECT_MANAGER: ['active-projects', 'budget-utilization', 'equipment', 'pending-approvals', 'site-attendance'],
    SITE_ENGINEER: ['my-projects', 'todays-attendance', 'my-requests'],
    ACCOUNTANT: ['total-spent', 'budget-utilization', 'remaining'],
    STORE_OFFICER: ['low-stock', 'pending-requests', 'purchase-value'],
}

const DASHBOARD_STAT_STEPS: Record<string, { title: string; description: string }> = {
    'active-projects': { title: 'Active Projects', description: 'Number of projects in progress and total projects. Click to open the Projects page.' },
    'budget-utilization': { title: 'Budget Utilization', description: 'How much of the total budget has been spent. Click to open the Budget vs Actual Tracker.' },
    'equipment': { title: 'Equipment', description: 'Total fleet size, available units, and those under maintenance. Click to manage equipment and schedules.' },
    'procurement': { title: 'Procurement Requests', description: 'Pending and approved material requests. Click to open Material Requests.' },
    'attendance': { title: 'Labor Attendance', description: 'Today’s attendance rate across all sites. Click to open Attendance.' },
    'material-stock': { title: 'Material Stock', description: 'Items at or below minimum stock. Click to open Stock Levels.' },
    'total-expenses': { title: 'Total Expenses', description: 'All-time spent across projects. Click to open the Budget Tracker.' },
    'pending-approvals': { title: 'Pending Approvals', description: 'Procurement requests awaiting your approval. Click to open Material Requests.' },
    'site-attendance': { title: 'Site Attendance', description: 'Today’s attendance across your sites. Click to open Attendance.' },
    'my-projects': { title: 'My Projects', description: 'Your active sites. Click to open the Projects list.' },
    'todays-attendance': { title: "Today's Attendance", description: 'Workers present today. Click to open Attendance.' },
    'my-requests': { title: 'My Requests', description: 'Your pending material requests. Click to open Material Requests.' },
    'total-spent': { title: 'Total Spent', description: 'Total spending across all projects. Click to open the Budget Tracker.' },
    'remaining': { title: 'Remaining', description: 'Budget left across projects. Click to open the Budget Tracker.' },
    'low-stock': { title: 'Low Stock Items', description: 'Materials that need restock. Click to open Stock Levels.' },
    'pending-requests': { title: 'Pending Requests', description: 'Material requests to process. Click to open Material Requests.' },
    'purchase-value': { title: 'Purchase Value', description: 'Value of approved or ordered requests. Click to open Material Requests.' },
}

// Safe defaults so we never crash on missing API fields
const DEFAULT_OVERVIEW = {
    total_projects: 0,
    active_projects: 0,
    total_budget: 0,
    total_spent: 0,
    budget_remaining: 0,
    budget_utilization: 0,
}
const DEFAULT_PROCUREMENT = { pending_requests: 0, approved_requests: 0, total_purchase_value: 0 }

function normalizeDashboardData(raw: unknown): DashboardData {
    const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    return {
        overview: (d.overview && typeof d.overview === 'object' ? d.overview : {}) as DashboardData['overview'],
        project_summaries: Array.isArray(d.project_summaries) ? d.project_summaries as DashboardData['project_summaries'] : [],
        attendance_summaries: Array.isArray(d.attendance_summaries) ? d.attendance_summaries as DashboardData['attendance_summaries'] : [],
        low_stock_alerts: Array.isArray(d.low_stock_alerts) ? d.low_stock_alerts as DashboardData['low_stock_alerts'] : [],
        procurement: (d.procurement && typeof d.procurement === 'object' ? d.procurement : {}) as DashboardData['procurement'],
        equipment: (d.equipment && typeof d.equipment === 'object' ? d.equipment : undefined) as DashboardData['equipment'],
        expense_breakdown: Array.isArray(d.expense_breakdown) ? d.expense_breakdown as DashboardData['expense_breakdown'] : undefined,
    }
}

function ensureOverview(data: DashboardData): DashboardData {
    const rawOverview = (data.overview && typeof data.overview === 'object' ? data.overview : {}) as Partial<DashboardData['overview']>
    const rawProc = (data.procurement && typeof data.procurement === 'object' ? data.procurement : {}) as Partial<DashboardData['procurement']>
    return {
        ...data,
        overview: {
            total_projects: Number(rawOverview.total_projects) || 0,
            active_projects: Number(rawOverview.active_projects) || 0,
            total_budget: Number(rawOverview.total_budget) || 0,
            total_spent: Number(rawOverview.total_spent) || 0,
            budget_remaining: Number(rawOverview.budget_remaining) || 0,
            budget_utilization: Number(rawOverview.budget_utilization) || 0,
        },
        procurement: {
            pending_requests: Number(rawProc.pending_requests) || 0,
            approved_requests: Number(rawProc.approved_requests) || 0,
            total_purchase_value: Number(rawProc.total_purchase_value) || 0,
        },
    }
}

export default function Dashboard() {
    const { user } = useAuth()
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
            setError(`Request timed out. Is the backend running at ${apiBaseURL.replace(/\/api\/v1\/?$/, '')}?`)
            setLoading(false)
            controller.abort()
        }, 15000)

        const fetchDashboard = async () => {
            let canceled = false
            try {
                const response = await api.get('/dashboard', { signal: controller.signal })
                clearTimeout(timeoutId)
                if (response.data?.success && response.data?.data != null) {
                    const normalized = normalizeDashboardData(response.data.data)
                    setData(ensureOverview(normalized))
                    setError(null)
                } else {
                    setError('Dashboard data was not available.')
                }
            } catch (e: unknown) {
                clearTimeout(timeoutId)
                const isCanceled =
                    (e instanceof Error && (e.name === 'AbortError' || e.name === 'CanceledError')) ||
                    (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'ERR_CANCELED')
                if (isCanceled) {
                    canceled = true
                    return
                }
                console.error('Failed to fetch dashboard data', e)
                setError('Could not load dashboard. Check that the server is running and you are signed in.')
            } finally {
                if (!canceled) setLoading(false)
            }
        }
        fetchDashboard()
        return () => {
            clearTimeout(timeoutId)
            controller.abort()
        }
    }, [])

    if (loading) {
        return (
            <div style={{ padding: '2rem' }}>
                <div className="page-header">
                    <div className="page-header-info">
                        <h1>Dashboard</h1>
                        <p>Loading…</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="page-header" style={{ padding: '2rem' }}>
                <div className="page-header-info">
                    <h1>Dashboard</h1>
                    <p style={{ color: '#0f172a', marginTop: '0.5rem', marginBottom: '1rem' }}>{error || 'Failed to load dashboard data.'}</p>
                    <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                        Make sure the backend is running at <code style={{ background: '#f1f5f9', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>{apiBaseURL.replace(/\/api\/v1\/?$/, '')}</code> and you are logged in.
                    </p>
                </div>
            </div>
        )
    }

    const role = (user?.role ?? 'ADMIN') as Role
    const config = ROLE_DASHBOARD_CONFIG[role] ?? ROLE_DASHBOARD_CONFIG.ADMIN

    const startDashboardTour = () => {
        const steps: { element: string; popover: { title: string; description: string } }[] = [
            { element: '#dashboard-header', popover: { title: config.title, description: `${config.subtitle} Use "Take tour" anytime to see these tips again. Click Close or press Escape to skip.` } },
        ]
        const statIds = ROLE_STAT_IDS[role] ?? ROLE_STAT_IDS.ADMIN
        statIds.forEach((id) => {
            const stepContent = DASHBOARD_STAT_STEPS[id]
            if (stepContent) {
                steps.push({
                    element: `#dashboard-stat-${id}`,
                    popover: { title: stepContent.title, description: stepContent.description },
                })
            }
        })
        steps.push({ element: '#dashboard-content', popover: { title: 'Your overview', description: 'Below: projects overview, quick actions, or links depending on your role. Use the buttons to open the full pages. Press Escape to close any modal.' } })
        const driverObj = driver({
            showProgress: true,
            steps,
            onDestroyed: () => {
                try { localStorage.setItem('dashboard-tour-done', 'true') } catch { /* ignore */ }
            },
        })
        driverObj.drive()
    }

    const showFirstTimeHint = typeof window !== 'undefined' && !localStorage.getItem('dashboard-tour-done')

    return (
        <div>
            <div id="dashboard-header" className="page-header">
                <div className="page-header-info">
                    <h1>{config.title}</h1>
                    <p>{config.subtitle}</p>
                    {showFirstTimeHint && (
                        <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-sm)' }}>
                            New here?{' '}
                            <button type="button" className="btn btn-secondary" style={{ padding: 'var(--space-1) var(--space-3)', fontSize: 'inherit' }} onClick={startDashboardTour}>
                                Take a tour
                            </button>
                        </p>
                    )}
                </div>
                <div className="page-header-actions">
                    <button type="button" className="btn btn-secondary" onClick={startDashboardTour}>
                        Take tour
                    </button>
                </div>
            </div>

            <div id="dashboard-content">
                {role === 'ADMIN' && <AdminDashboard data={data} />}
                {role === 'PROJECT_MANAGER' && <ProjectManagerDashboard data={data} />}
                {role === 'SITE_ENGINEER' && <SiteEngineerDashboard data={data} />}
                {role === 'ACCOUNTANT' && <AccountantDashboard data={data} />}
                {role === 'STORE_OFFICER' && <StoreOfficerDashboard data={data} />}
                {!['ADMIN', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'ACCOUNTANT', 'STORE_OFFICER'].includes(role) && (
                    <AdminDashboard data={data} />
                )}
            </div>
        </div>
    )
}
