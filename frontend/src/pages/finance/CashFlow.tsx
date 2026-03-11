import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export default function CashFlow() {
    const startTour = () => {
        const driverObj = driver({
            showProgress: true,
            steps: [
                { element: '#cashflow-header', popover: { title: 'Cash Flow', description: 'Track cash inflows and outflows across projects. Use "Take tour" anytime to see these tips again. Click Close or press Escape to skip.' } },
                { element: '#cashflow-content', popover: { title: 'Coming soon', description: 'Cash flow tracking and forecasting will be available in a future update. Use Budget Tracker and Profitability for current financial overview.' } },
            ],
            onDestroyed: () => { try { localStorage.setItem('cashflow-tour-done', 'true') } catch { /* ignore */ } },
        })
        driverObj.drive()
    }

    return (
        <div>
            <div id="cashflow-header" className="page-header">
                <div className="page-header-info">
                    <h1>Cash Flow</h1>
                    <p>Track cash inflows and outflows across projects. Coming soon.</p>
                </div>
                <div className="page-header-actions">
                    <button type="button" className="btn btn-secondary" onClick={startTour} title="Take a guided tour">Take tour</button>
                </div>
            </div>
            <div id="cashflow-content" className="content-card">
                <div className="content-card-header">
                    <div>
                        <div className="content-card-title">Cash Flow Analysis</div>
                        <div className="content-card-subtitle">Inflows, outflows, and net cash by period</div>
                    </div>
                </div>
                <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <p>Cash flow tracking and forecasting will be available in a future update.</p>
                    <p style={{ fontSize: 'var(--font-sm)', marginTop: 'var(--space-3)' }}>
                        Use Budget Tracker and Profitability for current financial overview.
                    </p>
                </div>
            </div>
        </div>
    )
}
