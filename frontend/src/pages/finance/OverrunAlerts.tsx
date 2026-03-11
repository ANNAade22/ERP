import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export default function OverrunAlerts() {
    const startTour = () => {
        const driverObj = driver({
            showProgress: true,
            steps: [
                { element: '#overrun-header', popover: { title: 'Overrun Alerts', description: 'Monitor projects at risk of budget overrun. Use "Take tour" anytime to see these tips again. Click Close or press Escape to skip.' } },
                { element: '#overrun-content', popover: { title: 'Coming soon', description: 'Automated overrun alerts will be available in a future update. Check Budget Tracker for projects marked "Over Budget."' } },
            ],
            onDestroyed: () => { try { localStorage.setItem('overrun-tour-done', 'true') } catch { /* ignore */ } },
        })
        driverObj.drive()
    }

    return (
        <div>
            <div id="overrun-header" className="page-header">
                <div className="page-header-info">
                    <h1>Overrun Alerts</h1>
                    <p>Monitor and manage projects at risk of budget overrun. Coming soon.</p>
                </div>
                <div className="page-header-actions">
                    <button type="button" className="btn btn-secondary" onClick={startTour} title="Take a guided tour">Take tour</button>
                </div>
            </div>
            <div id="overrun-content" className="content-card">
                <div className="content-card-header">
                    <div>
                        <div className="content-card-title">Budget Overrun Alerts</div>
                        <div className="content-card-subtitle">Projects exceeding or approaching budget limits</div>
                    </div>
                </div>
                <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <p>Automated overrun alerts and notifications will be available in a future update.</p>
                    <p style={{ fontSize: 'var(--font-sm)', marginTop: 'var(--space-3)' }}>
                        Check Budget Tracker for projects marked &quot;Over Budget.&quot;
                    </p>
                </div>
            </div>
        </div>
    )
}
