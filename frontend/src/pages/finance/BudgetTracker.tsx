import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Building2, TrendingDown } from 'lucide-react'
import api from '../../utils/api'

const POLL_INTERVAL_MS = 30_000

interface Overview {
    total_projects: number
    active_projects: number
    total_budget: number
    total_spent: number
    budget_remaining: number
    budget_utilization: number
}

interface ProjectSummary {
    id: string
    name: string
    status: string
    budget: number
    spent_amount: number
    remaining: number
    percent_used: number
}

interface CategoryBreakdown {
    category: string
    total: number
}

export default function BudgetTracker() {
    const [overview, setOverview] = useState<Overview | null>(null)
    const [projectSummaries, setProjectSummaries] = useState<ProjectSummary[]>([])
    const [expenseBreakdown, setExpenseBreakdown] = useState<CategoryBreakdown[]>([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const [activeTab, setActiveTab] = useState(0)

    const fetchBudget = async (isInitial = true) => {
        try {
            if (isInitial) setLoading(true)
            const response = await api.get('/dashboard')
            if (response.data?.success && response.data?.data) {
                const d = response.data.data as Record<string, unknown>
                if (d.overview && typeof d.overview === 'object') {
                    const o = d.overview as Record<string, unknown>
                    setOverview({
                        total_projects: Number(o.total_projects) || 0,
                        active_projects: Number(o.active_projects) || 0,
                        total_budget: Number(o.total_budget) || 0,
                        total_spent: Number(o.total_spent) || 0,
                        budget_remaining: Number(o.budget_remaining) ?? (Number(o.total_budget) || 0) - (Number(o.total_spent) || 0),
                        budget_utilization: Number(o.budget_utilization) || 0,
                    })
                }
                if (Array.isArray(d.project_summaries)) {
                    setProjectSummaries(d.project_summaries as ProjectSummary[])
                }
                if (Array.isArray(d.expense_breakdown)) {
                    setExpenseBreakdown(d.expense_breakdown as CategoryBreakdown[])
                }
                setLastUpdated(new Date())
            }
        } catch (err) {
            console.error('Failed to fetch budget data', err)
        } finally {
            if (isInitial) setLoading(false)
        }
    }

    useEffect(() => {
        fetchBudget(true)
        const interval = setInterval(() => fetchBudget(false), POLL_INTERVAL_MS)
        return () => clearInterval(interval)
    }, [])

    const variance = overview ? overview.total_budget - overview.total_spent : 0
    const variancePositive = variance >= 0
    const tabs = ['Project Budgets', 'Category Breakdown']

    if (loading && !overview) {
        return (
            <div>
                <div className="page-header">
                    <div className="page-header-info">
                        <h1>Budget vs Actual Tracker</h1>
                        <p>Loading…</p>
                    </div>
                </div>
            </div>
        )
    }

    const o = overview || {
        total_budget: 0,
        total_spent: 0,
        budget_remaining: 0,
        budget_utilization: 0,
    }

    const stats = [
        { title: 'Total Budget', value: `$${o.total_budget.toLocaleString()}`, subtitle: 'Approved budget', subtitleType: 'neutral' as const },
        { title: 'Actual Spent', value: `$${o.total_spent.toLocaleString()}`, subtitle: 'Current spending', subtitleType: 'neutral' as const },
        { title: 'Variance', value: `$${Math.abs(variance).toLocaleString()}`, subtitle: variancePositive ? '↘ Under budget' : 'Over budget', subtitleType: variancePositive ? 'positive' : 'negative' },
        { title: 'Budget Usage', value: `${o.budget_utilization.toFixed(1)}%`, subtitle: 'Of total budget', subtitleType: 'neutral' as const, hasBar: true, barPercent: Math.min(o.budget_utilization, 100) },
    ]

    return (
        <div>
            <div className="page-header">
                <div className="page-header-info">
                    <h1>Budget vs Actual Tracker</h1>
                    <p>Real-time budget monitoring and variance analysis. Data refreshes every 30 seconds.</p>
                </div>
                {lastUpdated && (
                    <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
                        Updated {lastUpdated.toLocaleTimeString()}
                    </span>
                )}
            </div>

            <div className="stat-cards">
                {stats.map((stat, i) => (
                    <div className="stat-card" key={i}>
                        <div className="stat-card-title" style={{ marginBottom: 'var(--space-2)' }}>{stat.title}</div>
                        <div className="stat-card-value">{stat.value}</div>
                        <div className={`stat-card-subtitle ${stat.subtitleType}`}>{stat.subtitle}</div>
                        {stat.hasBar && (
                            <div className="progress-bar" style={{ marginTop: 'var(--space-2)' }}>
                                <div
                                    className="progress-bar-fill"
                                    style={{
                                        width: `${Math.min(stat.barPercent!, 100)}%`,
                                        backgroundColor: (stat.barPercent ?? 0) > 90 ? 'var(--danger-color)' : undefined,
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="tabs">
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
                <div className="content-card">
                    <div className="content-card-header">
                        <div>
                            <div className="content-card-title">Project Budget Performance</div>
                            <div className="content-card-subtitle">Budget vs actual spending per project</div>
                        </div>
                    </div>
                    {projectSummaries.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No projects found.
                        </div>
                    ) : (
                        projectSummaries.map((project) => {
                            const usage = project.budget > 0 ? (project.spent_amount / project.budget) * 100 : 0
                            const overBudget = usage > 100
                            const varAmount = project.budget - project.spent_amount
                            return (
                                <div className="budget-project-card" key={project.id}>
                                    <div className="budget-project-header">
                                        <div className="budget-project-info">
                                            <div className="budget-project-icon">
                                                <Building2 size={20} />
                                            </div>
                                            <div>
                                                <Link to={`/projects/${project.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                    <div className="budget-project-name">{project.name}</div>
                                                </Link>
                                                <div className="budget-project-completion">{project.percent_used.toFixed(0)}% budget used</div>
                                            </div>
                                        </div>
                                        <span className={`badge badge-${project.status === 'COMPLETED' ? 'success' : overBudget ? 'danger' : 'info'}`}>
                                            {project.status.replace('_', ' ')}
                                        </span>
                                    </div>

                                    <div className="budget-project-metrics">
                                        <span className="budget-metric-label">Budgeted</span>
                                        <span className="budget-metric-value">${project.budget.toLocaleString()}</span>
                                        <div className="budget-metric-bar-container">
                                            <span className="budget-metric-bar-label">Budget Usage</span>
                                            <div className="progress-bar" style={{ flex: 1 }}>
                                                <div
                                                    className={`progress-bar-fill ${overBudget ? 'danger' : ''}`}
                                                    style={{ width: `${Math.min(usage, 100)}%` }}
                                                />
                                            </div>
                                            <span className="budget-metric-bar-value">{usage.toFixed(1)}%</span>
                                        </div>

                                        <span className="budget-metric-label">Actual</span>
                                        <span className="budget-metric-value">${project.spent_amount.toLocaleString()}</span>
                                    </div>

                                    <div className={`budget-project-variance ${varAmount >= 0 ? 'positive' : 'negative'}`}>
                                        <TrendingDown size={16} />
                                        Variance: ${Math.abs(varAmount).toLocaleString()} {varAmount >= 0 ? 'remaining' : 'over'}
                                    </div>

                                    <div className="budget-project-actions">
                                        <Link to={`/projects/${project.id}`} className="btn btn-secondary" style={{ height: '34px', fontSize: '0.8125rem' }}>
                                            View Details
                                        </Link>
                                    </div>
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
                            <div className="content-card-title">Expenses by Category</div>
                            <div className="content-card-subtitle">Approved expenses across all projects</div>
                        </div>
                    </div>
                    {expenseBreakdown.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No expense data by category.
                        </div>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {expenseBreakdown.map((e) => (
                                <li
                                    key={e.category}
                                    style={{
                                        padding: 'var(--space-4)',
                                        borderBottom: '1px solid var(--border)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span>{e.category}</span>
                                    <strong>${e.total.toLocaleString()}</strong>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    )
}
