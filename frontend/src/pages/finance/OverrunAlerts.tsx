import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

interface OverrunProject {
    id: string
    name: string
    status: string
    budget: number
    spent_amount: number
    overrun: number
    overrun_pct: number
}

const canViewProjectDetail = (role: string | undefined) =>
    role === 'ADMIN' || role === 'PROJECT_MANAGER' || role === 'SITE_ENGINEER'

export default function OverrunAlerts() {
    const { user } = useAuth()
    const [alerts, setAlerts] = useState<OverrunProject[]>([])
    const [loading, setLoading] = useState(true)

    const fetchAlerts = async () => {
        try {
            setLoading(true)
            const response = await api.get('/finance/overrun-alerts')
            if (response.data?.success && Array.isArray(response.data?.data)) {
                setAlerts(response.data.data as OverrunProject[])
            } else {
                setAlerts([])
            }
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(msg || 'Failed to fetch overrun alerts')
            setAlerts([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAlerts()
    }, [])

    const startTour = () => {
        const driverObj = driver({
            showProgress: true,
            steps: [
                { element: '#overrun-header', popover: { title: 'Overrun Alerts', description: 'Monitor projects that have exceeded their budget. Projects are sorted by overrun amount with severity indicators.' } },
                { element: '#overrun-content', popover: { title: 'Project cards', description: 'Each card shows budget, actual spent, overrun amount and percentage. Use View Details or Budget Tracker to manage.' } },
            ],
            onDestroyed: () => { try { localStorage.setItem('overrun-tour-done', 'true') } catch { /* ignore */ } },
        })
        driverObj.drive()
    }

    if (loading) {
        return (
            <div>
                <div id="overrun-header" className="page-header">
                    <div className="page-header-info">
                        <h1>Overrun Alerts</h1>
                        <p>Loading…</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div id="overrun-header" className="page-header">
                <div className="page-header-info">
                    <h1>Overrun Alerts</h1>
                    <p>Monitor and manage projects that have exceeded their budget. {alerts.length > 0 ? `${alerts.length} project(s) over budget.` : 'All projects are within budget.'}</p>
                </div>
                <div className="page-header-actions">
                    <button type="button" className="btn btn-secondary" onClick={startTour} title="Take a guided tour">Take tour</button>
                </div>
            </div>
            <div id="overrun-content" className="content-card" style={{ padding: 'var(--space-4)' }}>
                <div className="content-card-header" style={{ marginBottom: 'var(--space-4)' }}>
                    <div>
                        <div className="content-card-title">Budget Overrun Alerts</div>
                        <div className="content-card-subtitle">Projects exceeding budget limits, sorted by overrun amount</div>
                    </div>
                </div>
                {alerts.length === 0 ? (
                    <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <p>No overrun alerts. All projects are within budget.</p>
                        <p style={{ fontSize: 'var(--font-sm)', marginTop: 'var(--space-3)' }}>
                            Use Budget Tracker to monitor spending and add or approve expenses.
                        </p>
                        <Link to="/finance/budget-tracker" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
                            Go to Budget Tracker
                        </Link>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        {alerts.map((project) => {
                            const severity = project.overrun_pct > 20 ? 'Critical' : 'Warning'
                            return (
                                <div className="budget-project-card" key={project.id}>
                                    <div className="budget-project-header">
                                        <div className="budget-project-info">
                                            <div className="budget-project-icon" style={{ backgroundColor: project.overrun_pct > 20 ? 'var(--danger)' : 'var(--warning)' }}>
                                                <AlertTriangle size={20} />
                                            </div>
                                            <div>
                                                {canViewProjectDetail(user?.role) ? (
                                                    <Link to={`/projects/${project.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                        <div className="budget-project-name">{project.name}</div>
                                                    </Link>
                                                ) : (
                                                    <div className="budget-project-name">{project.name}</div>
                                                )}
                                                <div className="budget-project-completion">{project.status.replace(/_/g, ' ')}</div>
                                            </div>
                                        </div>
                                        <span className={`badge badge-${severity === 'Critical' ? 'danger' : 'warning'}`}>
                                            {severity}
                                        </span>
                                    </div>
                                    <div className="budget-project-financial-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
                                        <div className="budget-financial-item">
                                            <span className="budget-metric-label">Budget</span>
                                            <span className="budget-metric-value">${project.budget.toLocaleString()}</span>
                                        </div>
                                        <div className="budget-financial-item">
                                            <span className="budget-metric-label">Spent</span>
                                            <span className="budget-metric-value">${project.spent_amount.toLocaleString()}</span>
                                        </div>
                                        <div className="budget-financial-item budget-variance negative">
                                            <span className="budget-metric-label">Overrun</span>
                                            <span className="budget-metric-value">
                                                ${project.overrun.toLocaleString()} ({project.overrun_pct.toFixed(1)}%)
                                            </span>
                                        </div>
                                    </div>
                                    <div className="budget-project-actions" style={{ marginTop: 'var(--space-4)' }}>
                                        {canViewProjectDetail(user?.role) && (
                                            <Link to={`/projects/${project.id}`} className="btn btn-secondary" style={{ height: '34px', fontSize: '0.8125rem' }}>
                                                View Project
                                            </Link>
                                        )}
                                        <Link to="/finance/budget-tracker" className="btn btn-primary" style={{ height: '34px', fontSize: '0.8125rem' }}>
                                            Cost Breakdown
                                        </Link>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
