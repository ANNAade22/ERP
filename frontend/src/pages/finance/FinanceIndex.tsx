import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DollarSign, TrendingUp, AlertTriangle, Wallet } from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

interface Overview {
    total_budget: number
    total_spent: number
    budget_remaining: number
    budget_utilization: number
}

interface ProjectSummary {
    id: string
    name: string
    budget: number
    spent_amount: number
}

export default function FinanceIndex() {
    const [overview, setOverview] = useState<Overview | null>(null)
    const [projectSummaries, setProjectSummaries] = useState<ProjectSummary[]>([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    const fetchData = async () => {
        try {
            setLoading(true)
            const response = await api.get('/finance/budget-overview')
            if (response.data?.success && response.data?.data) {
                const d = response.data.data as { overview?: Overview; project_summaries?: ProjectSummary[] }
                if (d.overview) setOverview(d.overview)
                if (Array.isArray(d.project_summaries)) setProjectSummaries(d.project_summaries)
                setLastUpdated(new Date())
            }
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(msg || 'Failed to fetch finance overview')
            setOverview(null)
            setProjectSummaries([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const overrunCount = projectSummaries.filter((p) => p.budget > 0 && p.spent_amount > p.budget).length
    const variance = overview ? overview.total_budget - overview.total_spent : 0

    if (loading) {
        return (
            <div>
                <div className="page-header">
                    <div className="page-header-info">
                        <h1>Finance Overview</h1>
                        <p>Loading…</p>
                    </div>
                </div>
            </div>
        )
    }

    const cards = [
        {
            title: 'Total Budget',
            value: `$${overview?.total_budget?.toLocaleString() ?? 0}`,
            subtitle: 'Approved budget across projects',
            icon: <DollarSign size={24} />,
            link: '/finance/budget-tracker',
            linkLabel: 'Budget Tracker',
        },
        {
            title: 'Total Spent',
            value: `$${overview?.total_spent?.toLocaleString() ?? 0}`,
            subtitle: 'Actual spending to date',
            icon: <Wallet size={24} />,
            link: '/finance/budget-tracker',
            linkLabel: 'View details',
        },
        {
            title: 'Variance',
            value: `$${Math.abs(variance).toLocaleString()}`,
            subtitle: variance >= 0 ? 'Under budget' : 'Over budget',
            icon: <TrendingUp size={24} />,
            link: '/finance/budget-tracker',
            linkLabel: 'Variance analysis',
            variant: variance >= 0 ? 'positive' : 'negative',
        },
        {
            title: 'Projects Over Budget',
            value: String(overrunCount),
            subtitle: overrunCount > 0 ? 'Need attention' : 'All on track',
            icon: <AlertTriangle size={24} />,
            link: '/finance/overrun-alerts',
            linkLabel: 'View alerts',
            variant: overrunCount > 0 ? 'negative' : 'neutral',
        },
    ]

    const quickLinks = [
        { label: 'Budget Tracker', path: '/finance/budget-tracker', description: 'Budget vs actual, add expenses' },
        { label: 'Cash Flow', path: '/finance/cash-flow', description: 'Inflows and outflows by month' },
        { label: 'Profitability', path: '/finance/profitability', description: 'Revenue, costs, margins' },
        { label: 'Overrun Alerts', path: '/finance/overrun-alerts', description: 'Projects exceeding budget' },
        { label: 'Invoices & Payments', path: '/finance/invoices-payments', description: 'Manage vendor invoices and payments' },
    ]

    return (
        <div>
            <div className="page-header">
                <div className="page-header-info">
                    <h1>Finance Overview</h1>
                    <p>Central hub for financial monitoring. Budget, spending, and alerts across all projects.</p>
                </div>
                {lastUpdated && (
                    <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
                        Last updated {lastUpdated.toLocaleTimeString()}
                    </span>
                )}
            </div>

            <div className="stat-cards" style={{ marginBottom: 'var(--space-6)' }}>
                {cards.map((card, i) => (
                    <div className="stat-card" key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                            <span className="stat-card-title">{card.title}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{card.icon}</span>
                        </div>
                        <div className="stat-card-value">{card.value}</div>
                        <div className={`stat-card-subtitle ${card.variant || 'neutral'}`}>{card.subtitle}</div>
                        <Link to={card.link} style={{ marginTop: 'auto', fontSize: 'var(--font-sm)', color: 'var(--primary)' }}>
                            {card.linkLabel} →
                        </Link>
                    </div>
                ))}
            </div>

            <div className="content-card">
                <div className="content-card-header">
                    <div>
                        <div className="content-card-title">Quick Links</div>
                        <div className="content-card-subtitle">Navigate to finance modules</div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-4)', padding: 'var(--space-4)' }}>
                    {quickLinks.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            style={{
                                padding: 'var(--space-4)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)',
                                textDecoration: 'none',
                                color: 'inherit',
                                transition: 'border-color 0.2s, background 0.2s',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.borderColor = 'var(--primary)'
                                e.currentTarget.style.background = 'var(--bg-hover, rgba(0,0,0,0.02))'
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.borderColor = ''
                                e.currentTarget.style.background = ''
                            }}
                        >
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
                            <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>{item.description}</div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}
