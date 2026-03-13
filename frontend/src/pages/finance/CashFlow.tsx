import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import api from '../../utils/api'
import toast from 'react-hot-toast'

interface CashFlowMonth {
    month: string
    inflows: number
    outflows: number
    net: number
}

export default function CashFlow() {
    const [data, setData] = useState<CashFlowMonth[]>([])
    const [loading, setLoading] = useState(true)

    const fetchCashFlow = async () => {
        try {
            setLoading(true)
            const response = await api.get('/finance/cash-flow')
            if (response.data?.success && Array.isArray(response.data?.data)) {
                setData(response.data.data as CashFlowMonth[])
            } else {
                setData([])
            }
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            toast.error(msg || 'Failed to fetch cash flow data')
            setData([])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCashFlow()
    }, [])

    const totalInflows = data.reduce((sum, m) => sum + m.inflows, 0)
    const totalOutflows = data.reduce((sum, m) => sum + m.outflows, 0)
    const netCashFlow = totalInflows - totalOutflows

    const startTour = () => {
        const driverObj = driver({
            showProgress: true,
            steps: [
                { element: '#cashflow-header', popover: { title: 'Cash Flow', description: 'Track cash inflows (budget allocation) and outflows (approved expenses) by month. Net = Inflows minus Outflows.' } },
                { element: '#cashflow-content', popover: { title: 'Monthly breakdown', description: 'Inflows represent planned budget allocation; outflows are actual approved expenses. Use Budget Tracker for detailed expense management.' } },
            ],
            onDestroyed: () => { try { localStorage.setItem('cashflow-tour-done', 'true') } catch { /* ignore */ } },
        })
        driverObj.drive()
    }

    if (loading) {
        return (
            <div>
                <div id="cashflow-header" className="page-header">
                    <div className="page-header-info">
                        <h1>Cash Flow</h1>
                        <p>Loading…</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div>
            <div id="cashflow-header" className="page-header">
                <div className="page-header-info">
                    <h1>Cash Flow</h1>
                    <p>Track cash inflows (budget allocation) and outflows (approved expenses) across projects by month.</p>
                </div>
                <div className="page-header-actions">
                    <button type="button" className="btn btn-secondary" onClick={startTour} title="Take a guided tour">Take tour</button>
                </div>
            </div>

            <div id="cashflow-stat-cards" className="stat-cards">
                <div className="stat-card">
                    <div className="stat-card-title" style={{ marginBottom: 'var(--space-2)' }}>Total Inflows</div>
                    <div className="stat-card-value">${totalInflows.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="stat-card-subtitle neutral">Budget allocation (last 12 months)</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-title" style={{ marginBottom: 'var(--space-2)' }}>Total Outflows</div>
                    <div className="stat-card-value">${totalOutflows.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="stat-card-subtitle neutral">Approved expenses</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-title" style={{ marginBottom: 'var(--space-2)' }}>Net Cash Flow</div>
                    <div className="stat-card-value">${netCashFlow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className={`stat-card-subtitle ${netCashFlow >= 0 ? 'positive' : 'negative'}`}>
                        {netCashFlow >= 0 ? 'Surplus' : 'Deficit'}
                    </div>
                </div>
            </div>

            <div id="cashflow-content" className="content-card">
                <div className="content-card-header">
                    <div>
                        <div className="content-card-title">Cash Flow by Month</div>
                        <div className="content-card-subtitle">Inflows vs outflows (last 12 months). Inflows = budget/12; outflows = approved expenses.</div>
                    </div>
                </div>
                {data.length === 0 ? (
                    <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <p>No cash flow data yet.</p>
                        <p style={{ fontSize: 'var(--font-sm)', marginTop: 'var(--space-3)' }}>
                            Add projects with budgets and approve expenses to see inflows and outflows.
                        </p>
                        <Link to="/finance/budget-tracker" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
                            Go to Budget Tracker
                        </Link>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ textAlign: 'left', padding: 'var(--space-3)', fontWeight: 600 }}>Month</th>
                                    <th style={{ textAlign: 'right', padding: 'var(--space-3)', fontWeight: 600 }}>Inflows</th>
                                    <th style={{ textAlign: 'right', padding: 'var(--space-3)', fontWeight: 600 }}>Outflows</th>
                                    <th style={{ textAlign: 'right', padding: 'var(--space-3)', fontWeight: 600 }}>Net</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((m) => (
                                    <tr key={m.month} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                        <td style={{ padding: 'var(--space-3)' }}>{m.month}</td>
                                        <td style={{ textAlign: 'right', padding: 'var(--space-3)', color: 'var(--success)' }}>
                                            +${m.inflows.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: 'var(--space-3)', color: 'var(--danger)' }}>
                                            -${m.outflows.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td style={{
                                            textAlign: 'right',
                                            padding: 'var(--space-3)',
                                            fontWeight: 600,
                                            color: m.net >= 0 ? 'var(--success)' : 'var(--danger)',
                                        }}>
                                            {m.net >= 0 ? '+' : ''}${m.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
