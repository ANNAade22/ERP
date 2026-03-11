import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Building2, Download } from 'lucide-react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

const POLL_INTERVAL_MS = 30_000
const PROJECT_STATUSES = ['All', 'PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const

const canViewProjectDetail = (role: string | undefined) =>
    role === 'ADMIN' || role === 'PROJECT_MANAGER' || role === 'SITE_ENGINEER'

interface ProjectProfitability {
    id: string
    name: string
    status: string
    revenue: number
    costs: number
    profit: number
    profit_margin: number
    cost_efficiency: number
    completion: number
}

interface ProfitabilityData {
    total_revenue: number
    total_costs: number
    net_profit: number
    profit_margin: number
    projects: ProjectProfitability[]
}

export default function Profitability() {
    const { user } = useAuth()
    const [data, setData] = useState<ProfitabilityData | null>(null)
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const [activeTab, setActiveTab] = useState(0)
    const [statusFilter, setStatusFilter] = useState<string>('All')

    const fetchProfitability = async (isInitial = true) => {
        try {
            if (isInitial) setLoading(true)
            const response = await api.get('/finance/profitability')
            if (response.data?.success && response.data?.data) {
                setData(response.data.data as ProfitabilityData)
                setLastUpdated(new Date())
            }
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(msg || 'Failed to fetch profitability data')
            console.error('Failed to fetch profitability data', err)
        } finally {
            if (isInitial) setLoading(false)
        }
    }

    useEffect(() => {
        fetchProfitability(true)
        const interval = setInterval(() => fetchProfitability(false), POLL_INTERVAL_MS)
        return () => clearInterval(interval)
    }, [])

    const filteredProjects = useMemo(() => {
        if (!data?.projects) return []
        if (statusFilter === 'All') return data.projects
        return data.projects.filter((p) => p.status === statusFilter)
    }, [data?.projects, statusFilter])

    const handleExportAnalysis = () => {
        const d = data || { total_revenue: 0, total_costs: 0, net_profit: 0, profit_margin: 0, projects: [] }
        const summaryRow = ['Total', String(d.total_revenue), String(d.total_costs), String(d.net_profit), d.profit_margin.toFixed(1) + '%', '', '']
        const projectRows = filteredProjects.map((p) => [
            p.name,
            String(p.revenue),
            String(p.costs),
            String(p.profit),
            p.profit_margin.toFixed(1) + '%',
            p.cost_efficiency.toFixed(1) + '%',
            p.completion.toFixed(0) + '%',
        ])
        const rows: string[][] = [
            ['Project', 'Revenue', 'Costs', 'Profit', 'Margin %', 'Cost Efficiency %', 'Completion %'],
            summaryRow,
            ...projectRows,
        ]
        const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `profitability-report-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Analysis exported')
    }

    const tabs = ['Project Analysis', 'Trend Analysis', 'Cost Analysis', 'Revenue Streams']

    if (loading && !data) {
        return (
            <div>
                <div className="page-header">
                    <div className="page-header-info">
                        <h1>Project Profitability Analytics</h1>
                        <p>Loading…</p>
                    </div>
                </div>
            </div>
        )
    }

    const d = data || {
        total_revenue: 0,
        total_costs: 0,
        net_profit: 0,
        profit_margin: 0,
        projects: [],
    }

    const stats = [
        { title: 'Total Revenue', value: `$${d.total_revenue.toLocaleString()}`, subtitle: 'Contract value (budget)', subtitleType: 'neutral' as const },
        { title: 'Total Costs', value: `$${d.total_costs.toLocaleString()}`, subtitle: 'Actual spending', subtitleType: 'neutral' as const },
        { title: 'Net Profit', value: `$${d.net_profit.toLocaleString()}`, subtitle: d.net_profit >= 0 ? 'Profit' : 'Loss', subtitleType: d.net_profit >= 0 ? 'positive' : 'negative' },
        { title: 'Profit Margin', value: `${d.profit_margin.toFixed(1)}%`, subtitle: 'Overall margin', subtitleType: 'neutral' as const },
    ]

    const startTour = () => {
        const driverObj = driver({
            showProgress: true,
            steps: [
                { element: '#profitability-header', popover: { title: 'Project Profitability Analytics', description: 'Analyze profit margins and financial performance. Use "Take tour" anytime to see these tips again. Click Close or press Escape to skip.' } },
                { element: '#profitability-export-btn', popover: { title: 'Export Analysis', description: 'Download a CSV report of revenue, costs, profit, and margins per project.' } },
                { element: '#profitability-stat-cards', popover: { title: 'Summary', description: 'Total revenue, total costs, net profit, and overall profit margin.' } },
                { element: '#profitability-tabs', popover: { title: 'Tabs', description: 'Switch between Project Analysis, Trend Analysis, Cost Analysis, and Revenue Streams.' } },
                { element: '#profitability-content', popover: { title: 'Project breakdown', description: 'Per-project profitability with revenue, costs, profit, margin, and completion. Filter by status; use View Details to open a project.' } },
            ],
            onDestroyed: () => { try { localStorage.setItem('profitability-tour-done', 'true') } catch { /* ignore */ } },
        })
        driverObj.drive()
    }

    return (
        <div>
            <div id="profitability-header" className="page-header">
                <div className="page-header-info">
                    <h1>Project Profitability Analytics</h1>
                    <p>Analyze profit margins and financial performance across projects. Data refreshes every 30 seconds.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <button type="button" className="btn btn-secondary" onClick={startTour} title="Take a guided tour">Take tour</button>
                    {lastUpdated && (
                        <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
                            Last updated {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    <button id="profitability-export-btn" type="button" className="btn btn-secondary" onClick={handleExportAnalysis} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Download size={16} /> Export Analysis
                    </button>
                </div>
            </div>

            <div id="profitability-stat-cards" className="stat-cards">
                {stats.map((stat, i) => (
                    <div className="stat-card" key={i}>
                        <div className="stat-card-title" style={{ marginBottom: 'var(--space-2)' }}>{stat.title}</div>
                        <div className="stat-card-value">{stat.value}</div>
                        <div className={`stat-card-subtitle ${stat.subtitleType}`}>{stat.subtitle}</div>
                    </div>
                ))}
            </div>

            <div id="profitability-tabs" className="tabs">
                {tabs.map((tab, i) => (
                    <div
                        key={tab}
                        className={`tab ${activeTab === i ? 'active' : ''}`}
                        onClick={() => setActiveTab(i)}
                    >
                        {tab}
                    </div>
                ))}
            </div>

            {activeTab === 0 && (
                <div id="profitability-content" className="content-card">
                    <div className="content-card-header" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                        <div>
                            <div className="content-card-title">Project Profitability Breakdown</div>
                            <div className="content-card-subtitle">Detailed financial performance for each active project</div>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="form-input"
                                style={{ minWidth: 140 }}
                            >
                                {PROJECT_STATUSES.map((s) => (
                                    <option key={s} value={s}>Filter by {s.replace('_', ' ')}</option>
                                ))}
                            </select>
                            <button type="button" className="btn btn-secondary" disabled title="Coming soon">
                                Compare Projects
                            </button>
                        </div>
                    </div>
                    {filteredProjects.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <p>No projects with profitability data yet.</p>
                            <p style={{ fontSize: 'var(--font-sm)', marginTop: 'var(--space-2)' }}>
                                Projects with budgets and spending will appear here.
                            </p>
                        </div>
                    ) : (
                        filteredProjects.map((project) => {
                            const profitable = project.profit >= 0 && project.status !== 'CANCELLED'
                            return (
                                <div className="budget-project-card" key={project.id} style={{ marginBottom: 'var(--space-4)' }}>
                                    <div className="budget-project-header">
                                        <div className="budget-project-info">
                                            <div className="budget-project-icon">
                                                <Building2 size={20} />
                                            </div>
                                            <div>
                                                {canViewProjectDetail(user?.role) ? (
                                                    <Link to={`/projects/${project.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                        <div className="budget-project-name">{project.name}</div>
                                                    </Link>
                                                ) : (
                                                    <div className="budget-project-name">{project.name}</div>
                                                )}
                                                <div className="budget-project-completion">{project.completion.toFixed(0)}% Complete</div>
                                            </div>
                                        </div>
                                        <span className={`badge badge-${profitable ? 'success' : 'danger'}`}>
                                            {profitable ? 'Profitable' : 'At Risk'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                                        <div>
                                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Revenue</div>
                                            <div style={{ fontWeight: 600 }}>${project.revenue.toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Profit Margin</div>
                                            <div style={{ fontWeight: 600 }}>{project.profit_margin.toFixed(1)}%</div>
                                            <div className="progress-bar" style={{ marginTop: 4 }}>
                                                <div
                                                    className="progress-bar-fill"
                                                    style={{ width: `${Math.min(Math.max(project.profit_margin, 0), 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Cost Efficiency</div>
                                            <div style={{ fontWeight: 600 }}>{project.cost_efficiency.toFixed(1)}%</div>
                                            <div className="progress-bar" style={{ marginTop: 4 }}>
                                                <div
                                                    className="progress-bar-fill"
                                                    style={{ width: `${Math.min(Math.max(project.cost_efficiency, 0), 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>Completion</div>
                                            <div style={{ fontWeight: 600 }}>{project.completion.toFixed(0)}%</div>
                                            <div className="progress-bar" style={{ marginTop: 4 }}>
                                                <div
                                                    className="progress-bar-fill"
                                                    style={{ width: `${Math.min(project.completion, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {canViewProjectDetail(user?.role) && (
                                        <div className="budget-project-actions" style={{ marginTop: 'var(--space-4)' }}>
                                            <Link to={`/projects/${project.id}`} className="btn btn-secondary" style={{ height: '34px', fontSize: '0.8125rem' }}>
                                                View Details
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            )}

            {activeTab === 1 && (
                <div className="content-card">
                    <div className="content-card-header">
                        <div>
                            <div className="content-card-title">Trend Analysis</div>
                            <div className="content-card-subtitle">Coming soon</div>
                        </div>
                    </div>
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Trend analysis and historical comparisons will be available in a future update.
                    </div>
                </div>
            )}

            {activeTab === 2 && (
                <div className="content-card">
                    <div className="content-card-header">
                        <div>
                            <div className="content-card-title">Cost Analysis</div>
                            <div className="content-card-subtitle">Coming soon</div>
                        </div>
                    </div>
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Cost breakdown and analysis will be available in a future update.
                    </div>
                </div>
            )}

            {activeTab === 3 && (
                <div className="content-card">
                    <div className="content-card-header">
                        <div>
                            <div className="content-card-title">Revenue Streams</div>
                            <div className="content-card-subtitle">Coming soon</div>
                        </div>
                    </div>
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Revenue stream analysis will be available in a future update.
                    </div>
                </div>
            )}
        </div>
    )
}
