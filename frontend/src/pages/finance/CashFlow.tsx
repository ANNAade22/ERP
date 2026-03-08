export default function CashFlow() {
    return (
        <div>
            <div className="page-header">
                <div className="page-header-info">
                    <h1>Cash Flow</h1>
                    <p>Track cash inflows and outflows across projects. Coming soon.</p>
                </div>
            </div>
            <div className="content-card">
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
