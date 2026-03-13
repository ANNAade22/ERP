import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Building2, TrendingDown, TrendingUp, Search, X, Download, Plus } from 'lucide-react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

const POLL_INTERVAL_MS = 30_000
const PROJECT_STATUSES = ['All', 'PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] as const
const BUDGET_STATUS_FILTERS = ['All', 'On Track', 'Over Budget'] as const
const EXPENSE_CATEGORIES = ['LABOUR', 'MATERIAL', 'TRANSPORT', 'EQUIPMENT', 'OVERHEAD', 'OTHER'] as const

interface Overview {
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
    completion_percent: number
}

interface CategoryBreakdown {
    category: string
    total: number
}

interface MonthTotal {
    month: string
    total: number
}

interface Expense {
    id: string
    project_id: string
    category: string
    amount: number
    description: string
    date: string
    status: string
}

const canUpdateBudget = (role: string | undefined) =>
    role === 'ADMIN' || role === 'PROJECT_MANAGER'
const canAddExpense = (role: string | undefined) =>
    role === 'ADMIN' || role === 'ACCOUNTANT'
const canRejectExpense = (role: string | undefined) =>
    role === 'ADMIN' || role === 'PROJECT_MANAGER'
const canApproveExpense = (role: string | undefined) =>
    role === 'ADMIN' || role === 'PROJECT_MANAGER'
const canDeleteExpense = (role: string | undefined) =>
    role === 'ADMIN'
const canViewProjectDetail = (role: string | undefined) =>
    role === 'ADMIN' || role === 'PROJECT_MANAGER' || role === 'SITE_ENGINEER'

function formatLastUpdated(d: Date): string {
    const sec = Math.floor((Date.now() - d.getTime()) / 1000)
    if (sec < 60) return 'Just now'
    if (sec < 3600) {
        const min = Math.floor(sec / 60)
        return `${min} min ago`
    }
    return d.toLocaleTimeString()
}

function BudgetTracker() {
    const { user } = useAuth()
    const [overview, setOverview] = useState<Overview | null>(null)
    const [projectSummaries, setProjectSummaries] = useState<ProjectSummary[]>([])
    const [expenseBreakdown, setExpenseBreakdown] = useState<CategoryBreakdown[]>([])
    const [monthsData, setMonthsData] = useState<MonthTotal[]>([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const [activeTab, setActiveTab] = useState(0)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('All')
    const [budgetStatusFilter, setBudgetStatusFilter] = useState<string>('All')

    // Cost Breakdown modal
    const [costBreakdownProject, setCostBreakdownProject] = useState<ProjectSummary | null>(null)
    const [costBreakdownData, setCostBreakdownData] = useState<CategoryBreakdown[]>([])
    const [costBreakdownLoading, setCostBreakdownLoading] = useState(false)

    // Update Budget modal
    const [updateBudgetProject, setUpdateBudgetProject] = useState<ProjectSummary | null>(null)
    const [updateBudgetValue, setUpdateBudgetValue] = useState('')
    const [updateBudgetSubmitting, setUpdateBudgetSubmitting] = useState(false)

    // Add Budget from header (project selector)
    const [showAddBudgetModal, setShowAddBudgetModal] = useState(false)

    // Add Expense modal
    const [showAddExpenseModal, setShowAddExpenseModal] = useState(false)
    const [addExpenseProject, setAddExpenseProject] = useState('')
    const [addExpenseCategory, setAddExpenseCategory] = useState<string>(EXPENSE_CATEGORIES[0])
    const [addExpenseAmount, setAddExpenseAmount] = useState('')
    const [addExpenseDescription, setAddExpenseDescription] = useState('')
    const [addExpenseDate, setAddExpenseDate] = useState(() => new Date().toISOString().slice(0, 10))
    const [addExpenseSubmitting, setAddExpenseSubmitting] = useState(false)

    // Cost Breakdown: expenses list for cut cost
    const [costBreakdownExpenses, setCostBreakdownExpenses] = useState<Expense[]>([])

    const fetchBudget = async (isInitial = true) => {
        try {
            if (isInitial) setLoading(true)
            const [budgetRes, monthsRes] = await Promise.all([
                api.get('/finance/budget-overview'),
                api.get('/finance/expenses-by-month'),
            ])
            if (budgetRes.data?.success && budgetRes.data?.data) {
                const d = budgetRes.data.data as Record<string, unknown>
                if (d.overview && typeof d.overview === 'object') {
                    const o = d.overview as Record<string, unknown>
                    setOverview({
                        total_budget: Number(o.total_budget) || 0,
                        total_spent: Number(o.total_spent) || 0,
                        budget_remaining: Number(o.budget_remaining) ?? 0,
                        budget_utilization: Number(o.budget_utilization) || 0,
                    })
                }
                if (Array.isArray(d.project_summaries)) {
                    setProjectSummaries(d.project_summaries as ProjectSummary[])
                }
                if (Array.isArray(d.expense_breakdown)) {
                    setExpenseBreakdown(d.expense_breakdown as CategoryBreakdown[])
                }
            }
            if (monthsRes.data?.success && Array.isArray(monthsRes.data?.data)) {
                setMonthsData(monthsRes.data.data as MonthTotal[])
            }
            setLastUpdated(new Date())
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(msg || 'Failed to fetch budget data')
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

    const openCostBreakdown = async (project: ProjectSummary) => {
        setCostBreakdownProject(project)
        setCostBreakdownLoading(true)
        setCostBreakdownData([])
        setCostBreakdownExpenses([])
        try {
            const [breakdownRes, expensesRes] = await Promise.all([
                api.get(`/expenses/breakdown?project_id=${project.id}`),
                api.get(`/expenses?project_id=${project.id}`),
            ])
            if (breakdownRes.data?.success && Array.isArray(breakdownRes.data?.data)) {
                setCostBreakdownData(breakdownRes.data.data as CategoryBreakdown[])
            } else {
                setCostBreakdownData([])
            }
            if (expensesRes.data?.success && Array.isArray(expensesRes.data?.data)) {
                setCostBreakdownExpenses(expensesRes.data.data as Expense[])
            } else {
                setCostBreakdownExpenses([])
            }
        } catch (err) {
            toast.error('Failed to load cost breakdown')
            setCostBreakdownData([])
            setCostBreakdownExpenses([])
        } finally {
            setCostBreakdownLoading(false)
        }
    }

    const handleRejectExpense = async (expenseId: string) => {
        try {
            await api.patch(`/expenses/${expenseId}/status`, { status: 'REJECTED' })
            toast.success('Expense rejected — cost cut from actual')
            if (costBreakdownProject) openCostBreakdown(costBreakdownProject)
            fetchBudget(false)
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(msg || 'Failed to reject expense')
        }
    }

    const handleApproveExpense = async (expenseId: string) => {
        try {
            await api.patch(`/expenses/${expenseId}/status`, { status: 'APPROVED' })
            toast.success('Expense approved — added to actual spent')
            if (costBreakdownProject) openCostBreakdown(costBreakdownProject)
            fetchBudget(false)
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(msg || 'Failed to approve expense')
        }
    }

    const handleDeleteExpense = async (expenseId: string) => {
        if (!confirm('Delete this expense? This will reduce actual spent.')) return
        try {
            await api.delete(`/expenses/${expenseId}`)
            toast.success('Expense deleted — cost cut')
            if (costBreakdownProject) openCostBreakdown(costBreakdownProject)
            fetchBudget(false)
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(msg || 'Failed to delete expense')
        }
    }

    const handleExportReport = () => {
        const o = overview || { total_budget: 0, total_spent: 0, budget_remaining: 0, budget_utilization: 0 }
        const summaryRow: string[] = ['Summary', String(o.total_budget), String(o.total_spent), String(o.budget_remaining), o.budget_utilization.toFixed(1) + '%', '']
        const projectRows = filteredProjects.map((p) => {
            const v = p.budget - p.spent_amount
            const u = p.budget > 0 ? ((p.spent_amount / p.budget) * 100).toFixed(1) : '0'
            return [p.name, String(p.budget), String(p.spent_amount), String(v), u, p.spent_amount <= p.budget ? 'On Track' : 'Over Budget']
        })
        const rows: string[][] = [
            ['Project', 'Budget', 'Actual', 'Variance', 'Usage %', 'Status'],
            summaryRow,
            ...projectRows,
        ]
        const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `budget-report-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Report exported')
    }

    const handleAddExpense = async () => {
        if (!addExpenseProject || !addExpenseAmount) {
            toast.error('Select project and enter amount')
            return
        }
        const amount = parseFloat(addExpenseAmount)
        if (isNaN(amount) || amount <= 0) {
            toast.error('Enter a valid amount')
            return
        }
        setAddExpenseSubmitting(true)
        try {
            await api.post('/expenses', {
                project_id: addExpenseProject,
                category: addExpenseCategory,
                amount,
                description: addExpenseDescription || undefined,
                date: addExpenseDate,
            })
            toast.success('Expense added. Pending approval to count toward actual.')
            setShowAddExpenseModal(false)
            setAddExpenseProject('')
            setAddExpenseAmount('')
            setAddExpenseDescription('')
            setAddExpenseDate(new Date().toISOString().slice(0, 10))
            fetchBudget(false)
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(msg || 'Failed to add expense')
        } finally {
            setAddExpenseSubmitting(false)
        }
    }

    const openUpdateBudget = (project: ProjectSummary) => {
        setUpdateBudgetProject(project)
        setUpdateBudgetValue(project.budget.toString())
    }

    const handleUpdateBudget = async (): Promise<boolean> => {
        if (!updateBudgetProject) return false
        const value = parseFloat(updateBudgetValue)
        if (isNaN(value) || value < 0) {
            toast.error('Enter a valid budget amount (≥ 0)')
            return false
        }
        if (value < updateBudgetProject.spent_amount) {
            toast.error(`Budget cannot be less than actual spent ($${updateBudgetProject.spent_amount.toLocaleString()})`)
            return false
        }
        setUpdateBudgetSubmitting(true)
        try {
            await api.put(`/projects/${updateBudgetProject.id}`, { budget: value })
            toast.success('Budget updated successfully')
            setUpdateBudgetProject(null)
            fetchBudget(false)
            return true
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(msg || 'Failed to update budget')
            return false
        } finally {
            setUpdateBudgetSubmitting(false)
        }
    }

    const filteredProjects = useMemo(() => {
        let list = projectSummaries
        if (search.trim()) {
            const q = search.trim().toLowerCase()
            list = list.filter((p) => p.name.toLowerCase().includes(q))
        }
        if (statusFilter !== 'All') {
            list = list.filter((p) => p.status === statusFilter)
        }
        if (budgetStatusFilter !== 'All') {
            if (budgetStatusFilter === 'On Track') {
                list = list.filter((p) => p.spent_amount <= p.budget && p.status !== 'CANCELLED')
            } else {
                list = list.filter((p) => p.spent_amount > p.budget)
            }
        }
        return list
    }, [projectSummaries, search, statusFilter, budgetStatusFilter])

    const variance = overview ? overview.total_budget - overview.total_spent : 0
    const variancePositive = variance >= 0
    const tabs = ['Project Budgets', 'Category Breakdown', 'Monthly Trends']

    const startTour = () => {
        const driverObj = driver({
            showProgress: true,
            steps: [
                { element: '#budget-tracker-header', popover: { title: 'Budget vs Actual Tracker', description: 'Monitor budget vs spending and variance here. Use "Take tour" anytime to see these tips again. Click Close or press Escape to skip.' } },
                { element: '#budget-tracker-export-btn', popover: { title: 'Export Report', description: 'Download a CSV report of budget, actual, variance, and status for all projects.' } },
                { element: '#budget-tracker-add-budget-btn', popover: { title: 'Add Budget', description: 'Set or update a project budget. Available to Admin and Project Manager.' } },
                { element: '#budget-tracker-add-expense-btn', popover: { title: 'Add Expense', description: 'Record a cost for a project. Expenses need approval before they count toward actual spent.' } },
                { element: '#budget-tracker-stat-cards', popover: { title: 'Overview', description: 'Total budget, actual spent, variance, and budget usage across all projects.' } },
                { element: '#budget-tracker-tabs', popover: { title: 'Tabs', description: 'Switch between Project Budgets, Category Breakdown, and Monthly Trends.' } },
                { element: '#budget-tracker-projects-card', popover: { title: 'Project Budgets', description: 'Per-project budget vs actual, variance, and progress. Use Cost Breakdown to view or cut costs; Update Budget to change the budget. Press Escape to close modals.' } },
            ],
            onDestroyed: () => {
                try { localStorage.setItem('budget-tracker-tour-done', 'true'); } catch { /* ignore */ }
            },
        })
        driverObj.drive()
    }

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
            <div id="budget-tracker-header" className="page-header" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div className="page-header-info">
                    <h1>Budget vs Actual Tracker</h1>
                    <p>Real-time budget monitoring and variance analysis. Data refreshes every 30 seconds.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-secondary" onClick={startTour} title="Take a guided tour">
                        Take tour
                    </button>
                    {lastUpdated && (
                        <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>
                            Last updated {formatLastUpdated(lastUpdated)}
                        </span>
                    )}
                    <button id="budget-tracker-export-btn" type="button" className="btn btn-secondary" onClick={handleExportReport} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Download size={16} /> Export Report
                    </button>
                    {canUpdateBudget(user?.role) && (
                        <button id="budget-tracker-add-budget-btn" type="button" className="btn btn-secondary" onClick={() => { setShowAddBudgetModal(true); setUpdateBudgetProject(null); setUpdateBudgetValue(''); }} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Plus size={16} /> Add Budget
                        </button>
                    )}
                    {canAddExpense(user?.role) && (
                        <button id="budget-tracker-add-expense-btn" type="button" className="btn btn-primary" onClick={() => setShowAddExpenseModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Plus size={16} /> Add Expense
                        </button>
                    )}
                </div>
            </div>

            <div id="budget-tracker-stat-cards" className="stat-cards">
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
                                        backgroundColor: (stat.barPercent ?? 0) > 90 ? 'var(--danger)' : undefined,
                                    }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div id="budget-tracker-tabs" className="tabs">
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
                <div id="budget-tracker-projects-card" className="content-card" style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap', minWidth: 0 }}>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Project Budget Performance</span>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>·</span>
                            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Track budget vs actual</span>
                            {projectSummaries.filter((p) => p.budget > 0 && p.spent_amount > p.budget).length > 0 && (
                                <span className="badge badge-danger" style={{ fontSize: '10px' }}>
                                    {projectSummaries.filter((p) => p.budget > 0 && p.spent_amount > p.budget).length} over budget
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexShrink: 0 }}>
                            <div className="input-with-icon" style={{ width: 140 }}>
                                <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    style={{ paddingLeft: '1.75rem', height: 32, fontSize: '0.8125rem' }}
                                    className="form-input"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="form-input"
                                style={{ minWidth: 100, height: 32, fontSize: '0.8125rem', paddingLeft: 8, paddingRight: 24 }}
                            >
                                {PROJECT_STATUSES.map((s) => (
                                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                                ))}
                            </select>
                            <select
                                value={budgetStatusFilter}
                                onChange={(e) => setBudgetStatusFilter(e.target.value)}
                                className="form-input"
                                style={{ minWidth: 100, height: 32, fontSize: '0.8125rem', paddingLeft: 8, paddingRight: 24 }}
                            >
                                {BUDGET_STATUS_FILTERS.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            {canAddExpense(user?.role) && (
                                <button type="button" className="btn btn-primary" onClick={() => setShowAddExpenseModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, height: 32, fontSize: '0.8125rem', paddingLeft: 10, paddingRight: 10 }}>
                                    <Plus size={14} /> Add Expense
                                </button>
                            )}
                        </div>
                    </div>
                    {filteredProjects.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            {projectSummaries.length === 0 ? (
                                <>
                                    <p style={{ marginBottom: 'var(--space-3)' }}>No projects with budgets yet.</p>
                                    <p style={{ fontSize: 'var(--font-sm)', marginBottom: 'var(--space-4)' }}>
                                        {canUpdateBudget(user?.role)
                                            ? 'Create projects first, then add budgets from the header or project settings.'
                                            : 'Projects need budgets to appear here.'}
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
                                        {canUpdateBudget(user?.role) && (
                                            <Link to="/projects" className="btn btn-primary">Go to Projects</Link>
                                        )}
                                        {canAddExpense(user?.role) && (
                                            <span style={{ fontSize: 'var(--font-sm)' }}>
                                                Add expenses to track costs. Expenses need approval before they count toward actual spent.
                                            </span>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p>No projects match your filters.</p>
                                    <p style={{ fontSize: 'var(--font-sm)', marginTop: 'var(--space-2)' }}>
                                        Try different search terms or filter options.
                                    </p>
                                </>
                            )}
                        </div>
                    ) : (
                        filteredProjects.map((project) => {
                            const usage = project.budget > 0 ? (project.spent_amount / project.budget) * 100 : 0
                            const overBudget = usage > 100
                            const varAmount = project.budget - project.spent_amount
                            const completion = project.completion_percent ?? project.percent_used
                            const onTrack = !overBudget && project.status !== 'CANCELLED'
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
                                                <div className="budget-project-completion">{completion.toFixed(0)}% Complete</div>
                                            </div>
                                        </div>
                                        <span className={`badge badge-${onTrack ? 'success' : overBudget ? 'danger' : project.status === 'COMPLETED' ? 'info' : 'warning'}`}>
                                            {onTrack ? 'On Track' : overBudget ? 'Over Budget' : project.status.replace(/_/g, ' ')}
                                        </span>
                                    </div>

                                    <div className="budget-project-financial-row">
                                        <div className="budget-financial-item">
                                            <span className="budget-metric-label">Budgeted</span>
                                            <span className="budget-metric-value">${project.budget.toLocaleString()}</span>
                                        </div>
                                        <div className="budget-financial-item">
                                            <span className="budget-metric-label">Actual</span>
                                            <span className="budget-metric-value">${project.spent_amount.toLocaleString()}</span>
                                        </div>
                                        <div className={`budget-financial-item budget-variance ${varAmount >= 0 ? 'positive' : 'negative'}`}>
                                            <span className="budget-metric-label">Variance</span>
                                            <span className="budget-metric-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                {varAmount >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                                {varAmount >= 0 ? '+' : ''}{varAmount.toLocaleString(undefined, { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                {varAmount >= 0 ? ' remaining' : ' over'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="budget-project-progress-rows">
                                        <div className="budget-progress-row">
                                            <span className="budget-metric-bar-label">Budget Usage</span>
                                            <div className="progress-bar" style={{ flex: 1 }}>
                                                <div
                                                    className={`progress-bar-fill ${overBudget ? 'danger' : ''}`}
                                                    style={{ width: `${Math.min(usage, 120)}%` }}
                                                />
                                            </div>
                                            <span className="budget-metric-bar-value">{usage.toFixed(1)}%</span>
                                        </div>
                                        <div className="budget-progress-row">
                                            <span className="budget-metric-bar-label">Project Progress</span>
                                            <div className="progress-bar" style={{ flex: 1 }}>
                                                <div
                                                    className="progress-bar-fill"
                                                    style={{ width: `${Math.min(completion, 100)}%` }}
                                                />
                                            </div>
                                            <span className="budget-metric-bar-value">{completion.toFixed(1)}%</span>
                                        </div>
                                    </div>

                                    <div className="budget-project-actions">
                                        {canViewProjectDetail(user?.role) && (
                                            <Link to={`/projects/${project.id}`} className="btn btn-secondary" style={{ height: '34px', fontSize: '0.8125rem' }}>
                                                View Details
                                            </Link>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            style={{ height: '34px', fontSize: '0.8125rem' }}
                                            onClick={() => openCostBreakdown(project)}
                                        >
                                            Cost Breakdown
                                        </button>
                                        {canUpdateBudget(user?.role) ? (
                                            <button
                                                type="button"
                                                className="btn btn-primary"
                                                style={{ height: '34px', fontSize: '0.8125rem' }}
                                                onClick={() => openUpdateBudget(project)}
                                            >
                                                Update Budget
                                            </button>
                                        ) : null}
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
                            <p>No approved expense data by category yet.</p>
                            <p style={{ fontSize: 'var(--font-sm)', marginTop: 'var(--space-2)' }}>
                                {canAddExpense(user?.role)
                                    ? 'Add expenses and have them approved to see category breakdowns.'
                                    : 'Approved expenses will appear here by category.'}
                            </p>
                            {canAddExpense(user?.role) && (
                                <button type="button" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }} onClick={() => setShowAddExpenseModal(true)}>
                                    Add Expense
                                </button>
                            )}
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

            {activeTab === 2 && (
                <div className="content-card">
                    <div className="content-card-header">
                        <div>
                            <div className="content-card-title">Monthly Expenses</div>
                            <div className="content-card-subtitle">Approved expenses by month (last 12 months)</div>
                        </div>
                    </div>
                    {monthsData.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <p>No monthly expense data yet.</p>
                            <p style={{ fontSize: 'var(--font-sm)', marginTop: 'var(--space-2)' }}>
                                Approved expenses will appear here by month (last 12 months).
                            </p>
                        </div>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {monthsData.map((m) => (
                                <li
                                    key={m.month}
                                    style={{
                                        padding: 'var(--space-4)',
                                        borderBottom: '1px solid var(--border)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span>{m.month}</span>
                                    <strong>${m.total.toLocaleString()}</strong>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Cost Breakdown Modal — includes expenses list to cut cost */}
            {costBreakdownProject && (
                <div className="modal-overlay" onClick={() => setCostBreakdownProject(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', maxHeight: '85vh', overflow: 'auto' }}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Cost Breakdown</h2>
                                <p className="modal-subtitle">{costBreakdownProject.name} — view or cut costs</p>
                            </div>
                            <button type="button" className="modal-close" onClick={() => setCostBreakdownProject(null)} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {costBreakdownLoading ? (
                                <p style={{ color: 'var(--text-secondary)' }}>Loading…</p>
                            ) : (
                                <>
                                    {costBreakdownData.length > 0 && (
                                        <div style={{ marginBottom: 'var(--space-5)' }}>
                                            <h3 style={{ fontSize: 'var(--font-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>By Category</h3>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {costBreakdownData.map((item) => (
                                                    <li key={item.category} style={{ padding: 'var(--space-2)', display: 'flex', justifyContent: 'space-between' }}>
                                                        <span>{item.category}</span>
                                                        <strong>${item.total.toLocaleString()}</strong>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <div>
                                        <h3 style={{ fontSize: 'var(--font-sm)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>Expenses — cut cost: reject or delete</h3>
                                        {costBreakdownExpenses.length === 0 ? (
                                            <p style={{ color: 'var(--text-secondary)' }}>No expenses for this project.</p>
                                        ) : (
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                                {costBreakdownExpenses.map((exp) => (
                                                    <li
                                                        key={exp.id}
                                                        style={{
                                                            padding: 'var(--space-3)',
                                                            borderBottom: '1px solid var(--border-light)',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            gap: 'var(--space-3)',
                                                        }}
                                                    >
                                                        <div>
                                                            <span style={{ fontWeight: 600 }}>${exp.amount.toLocaleString()}</span>
                                                            <span style={{ marginLeft: 8, fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>{exp.category}</span>
                                                            {exp.description && <div style={{ fontSize: 'var(--font-xs)', color: 'var(--text-secondary)' }}>{exp.description}</div>}
                                                            <span className={`badge badge-${exp.status === 'APPROVED' ? 'success' : exp.status === 'PENDING' ? 'warning' : 'neutral'}`} style={{ marginTop: 4, display: 'inline-block' }}>{exp.status}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                            {exp.status === 'PENDING' && canApproveExpense(user?.role) && (
                                                                <button type="button" className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => handleApproveExpense(exp.id)}>
                                                                    Approve
                                                                </button>
                                                            )}
                                                            {exp.status === 'PENDING' && canRejectExpense(user?.role) && (
                                                                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 8px' }} onClick={() => handleRejectExpense(exp.id)}>
                                                                    Reject
                                                                </button>
                                                            )}
                                                            {canDeleteExpense(user?.role) && (
                                                                <button type="button" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 8px', color: 'var(--danger)' }} onClick={() => handleDeleteExpense(exp.id)}>
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setCostBreakdownProject(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Budget Modal (from header — select project) */}
            {showAddBudgetModal && (
                <div className="modal-overlay" onClick={() => setShowAddBudgetModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Add / Update Budget</h2>
                                <p className="modal-subtitle">Select project and set budget amount</p>
                            </div>
                            <button type="button" className="modal-close" onClick={() => setShowAddBudgetModal(false)} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Project</label>
                                <select
                                    className="form-input"
                                    value={updateBudgetProject?.id || ''}
                                    onChange={(e) => {
                                        const p = projectSummaries.find((x) => x.id === e.target.value)
                                        if (p) { setUpdateBudgetProject(p); setUpdateBudgetValue(p.budget.toString()) } else { setUpdateBudgetProject(null); setUpdateBudgetValue('0') }
                                    }}
                                >
                                    <option value="">Select project</option>
                                    {projectSummaries.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            {updateBudgetProject && (
                                <div className="form-group">
                                    <label className="form-label" htmlFor="header-budget-amount">Budget Amount ($)</label>
                                    <input
                                        id="header-budget-amount"
                                        type="number"
                                        min={updateBudgetProject.spent_amount}
                                        step="0.01"
                                        className="form-input"
                                        value={updateBudgetValue}
                                        onChange={(e) => setUpdateBudgetValue(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowAddBudgetModal(false)}>Cancel</button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                disabled={updateBudgetSubmitting || !updateBudgetProject}
                                onClick={async () => {
                                    const ok = await handleUpdateBudget()
                                    if (ok) setShowAddBudgetModal(false)
                                }}
                            >
                                {updateBudgetSubmitting ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Update Budget Modal (from project card) */}
            {updateBudgetProject && !showAddBudgetModal && (
                <div className="modal-overlay" onClick={() => !updateBudgetSubmitting && setUpdateBudgetProject(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Update Budget</h2>
                                <p className="modal-subtitle">{updateBudgetProject.name}</p>
                            </div>
                            <button type="button" className="modal-close" onClick={() => !updateBudgetSubmitting && setUpdateBudgetProject(null)} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label" htmlFor="budget-amount">New Budget Amount ($)</label>
                                <input
                                    id="budget-amount"
                                    type="number"
                                    min={updateBudgetProject.spent_amount}
                                    step="0.01"
                                    className="form-input"
                                    value={updateBudgetValue}
                                    onChange={(e) => setUpdateBudgetValue(e.target.value)}
                                    placeholder="Enter amount"
                                />
                                <p style={{ fontSize: 'var(--font-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
                                    Minimum: ${updateBudgetProject.spent_amount.toLocaleString()} (actual spent)
                                </p>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setUpdateBudgetProject(null)} disabled={updateBudgetSubmitting}>
                                Cancel
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleUpdateBudget} disabled={updateBudgetSubmitting}>
                                {updateBudgetSubmitting ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Expense Modal */}
            {showAddExpenseModal && (
                <div className="modal-overlay" onClick={() => !addExpenseSubmitting && setShowAddExpenseModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Add Expense</h2>
                                <p className="modal-subtitle">Record a cost for a project. Pending until approved.</p>
                            </div>
                            <button type="button" className="modal-close" onClick={() => !addExpenseSubmitting && setShowAddExpenseModal(false)} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Project</label>
                                <select className="form-input" value={addExpenseProject} onChange={(e) => setAddExpenseProject(e.target.value)} required>
                                    <option value="">Select project</option>
                                    {projectSummaries.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category</label>
                                <select className="form-input" value={addExpenseCategory} onChange={(e) => setAddExpenseCategory(e.target.value)}>
                                    {EXPENSE_CATEGORIES.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Amount ($)</label>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    className="form-input"
                                    value={addExpenseAmount}
                                    onChange={(e) => setAddExpenseAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={addExpenseDate}
                                    onChange={(e) => setAddExpenseDate(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Description (optional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={addExpenseDescription}
                                    onChange={(e) => setAddExpenseDescription(e.target.value)}
                                    placeholder="e.g. Materials for foundation"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowAddExpenseModal(false)} disabled={addExpenseSubmitting}>
                                Cancel
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleAddExpense} disabled={addExpenseSubmitting}>
                                {addExpenseSubmitting ? 'Adding…' : 'Add Expense'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default BudgetTracker
