import { useState } from 'react'
import { Building2, TrendingDown } from 'lucide-react'

const stats = [
    { title: 'Total Budget', value: '$1,520,000', subtitle: 'Approved budget', subtitleType: 'neutral' },
    { title: 'Actual Spent', value: '$1,463,000', subtitle: 'Current spending', subtitleType: 'neutral' },
    { title: 'Variance', value: '$57,000', subtitle: '↘ Under budget', subtitleType: 'positive' },
    { title: 'Budget Usage', value: '96.3%', subtitle: 'Of total budget', subtitleType: 'neutral', hasBar: true, barPercent: 96.3 },
]

const tabs = ['Project Budgets', 'Category Breakdown', 'Monthly Trends']

const projects = [
    {
        name: 'Site A - Foundation',
        completion: '85% Complete',
        status: 'On Track',
        statusBadge: 'success',
        budgeted: '$750,000',
        actual: '$680,000',
        variance: '$70,000',
        variancePositive: true,
        budgetUsage: 90.7,
        projectProgress: 85,
    },
    {
        name: 'Site B - Renovation',
        completion: '93% Complete',
        status: 'Over Budget',
        statusBadge: 'danger',
        budgeted: '$300,000',
        actual: '$340,000',
        variance: '-$40,000',
        variancePositive: false,
        budgetUsage: 113.3,
        projectProgress: 93,
    },
    {
        name: 'Site C - Electrical',
        completion: '60% Complete',
        status: 'On Track',
        statusBadge: 'success',
        budgeted: '$200,000',
        actual: '$178,000',
        variance: '$22,000',
        variancePositive: true,
        budgetUsage: 89,
        projectProgress: 60,
    },
]

export default function BudgetTracker() {
    const [activeTab, setActiveTab] = useState(0)

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-info">
                    <h1>Budget vs Actual Tracker</h1>
                    <p>Real-time budget monitoring and variance analysis</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-secondary">Export Report</button>
                    <button className="btn btn-primary">Add Budget</button>
                </div>
            </div>

            {/* Stat Cards */}
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
                                    style={{ width: `${Math.min(stat.barPercent!, 100)}%` }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Tabs */}
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

            {/* Project Budget Performance */}
            <div className="content-card">
                <div className="content-card-header">
                    <div>
                        <div className="content-card-title">Project Budget Performance</div>
                        <div className="content-card-subtitle">Track budget vs actual spending for each project</div>
                    </div>
                </div>

                {/* Filter Row */}
                <div className="filter-row">
                    <input className="filter-input" type="text" placeholder="Search projects..." />
                    <select className="filter-select">
                        <option>Filter by status</option>
                        <option>On Track</option>
                        <option>Over Budget</option>
                    </select>
                </div>

                {projects.map((project, i) => (
                    <div className="budget-project-card" key={i}>
                        <div className="budget-project-header">
                            <div className="budget-project-info">
                                <div className="budget-project-icon">
                                    <Building2 size={20} />
                                </div>
                                <div>
                                    <div className="budget-project-name">{project.name}</div>
                                    <div className="budget-project-completion">{project.completion}</div>
                                </div>
                            </div>
                            <span className={`badge badge-${project.statusBadge}`}>{project.status}</span>
                        </div>

                        <div className="budget-project-metrics">
                            <span className="budget-metric-label">Budgeted</span>
                            <span className="budget-metric-value">{project.budgeted}</span>
                            <div className="budget-metric-bar-container">
                                <span className="budget-metric-bar-label">Budget Usage</span>
                                <div className="progress-bar" style={{ flex: 1 }}>
                                    <div
                                        className={`progress-bar-fill ${project.budgetUsage > 100 ? 'danger' : ''}`}
                                        style={{ width: `${Math.min(project.budgetUsage, 100)}%` }}
                                    />
                                </div>
                                <span className="budget-metric-bar-value">{project.budgetUsage}%</span>
                            </div>

                            <span className="budget-metric-label">Actual</span>
                            <span className="budget-metric-value">{project.actual}</span>
                            <div className="budget-metric-bar-container">
                                <span className="budget-metric-bar-label">Project Progress</span>
                                <div className="progress-bar" style={{ flex: 1 }}>
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${project.projectProgress}%` }}
                                    />
                                </div>
                                <span className="budget-metric-bar-value">{project.projectProgress}%</span>
                            </div>
                        </div>

                        <div className={`budget-project-variance ${project.variancePositive ? 'positive' : 'negative'}`}>
                            {project.variancePositive ? <TrendingDown size={16} /> : <TrendingDown size={16} />}
                            Variance: {project.variance}
                        </div>

                        <div className="budget-project-actions">
                            <button className="btn btn-secondary" style={{ height: '34px', fontSize: '0.8125rem' }}>
                                View Details
                            </button>
                            <button className="btn btn-secondary" style={{ height: '34px', fontSize: '0.8125rem' }}>
                                Cost Breakdown
                            </button>
                            <button className="btn btn-danger" style={{ height: '34px', fontSize: '0.8125rem' }}>
                                Update Budget
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
