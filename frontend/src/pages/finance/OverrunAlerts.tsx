export default function OverrunAlerts() {
    return (
        <div>
            <div className="page-header">
                <div className="page-header-info">
                    <h1>Overrun Alerts</h1>
                    <p>Monitor and manage projects at risk of budget overrun. Coming soon.</p>
                </div>
            </div>
            <div className="content-card">
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
