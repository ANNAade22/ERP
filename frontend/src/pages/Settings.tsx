export default function Settings() {
    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-info">
                    <h1>Settings</h1>
                    <p>Manage your account and system preferences</p>
                </div>
            </div>

            {/* Profile Settings */}
            <div className="content-card">
                <div className="settings-section">
                    <div className="settings-section-title">Profile Settings</div>
                    <div className="settings-row">
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input className="form-input" type="text" defaultValue="Admin User" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input className="form-input" type="email" defaultValue="admin@constructionerp.com" />
                        </div>
                    </div>
                    <div className="settings-row">
                        <div className="form-group">
                            <label className="form-label">Phone Number</label>
                            <input className="form-input" type="tel" defaultValue="+91 98765 43210" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <input className="form-input" type="text" defaultValue="Administrator" disabled />
                        </div>
                    </div>
                </div>
            </div>

            {/* Company Settings */}
            <div className="content-card">
                <div className="settings-section">
                    <div className="settings-section-title">Company Information</div>
                    <div className="settings-row">
                        <div className="form-group">
                            <label className="form-label">Company Name</label>
                            <input className="form-input" type="text" defaultValue="Construction Corp Ltd." />
                        </div>
                        <div className="form-group">
                            <label className="form-label">GST / Tax ID</label>
                            <input className="form-input" type="text" defaultValue="22AAAAA0000A1Z5" />
                        </div>
                    </div>
                    <div className="settings-row">
                        <div className="form-group">
                            <label className="form-label">Address</label>
                            <input className="form-input" type="text" defaultValue="123 Business Park, Downtown" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Currency</label>
                            <select className="filter-select" style={{ width: '100%', height: '42px' }}>
                                <option>USD ($)</option>
                                <option>INR (₹)</option>
                                <option>EUR (€)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Security */}
            <div className="content-card">
                <div className="settings-section">
                    <div className="settings-section-title">Security</div>
                    <div className="settings-row">
                        <div className="form-group">
                            <label className="form-label">Current Password</label>
                            <input className="form-input" type="password" placeholder="Enter current password" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <input className="form-input" type="password" placeholder="Enter new password" />
                        </div>
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: 'var(--space-2)' }}>
                        Update Password
                    </button>
                </div>
            </div>

            {/* Save */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                <button className="btn btn-secondary">Cancel</button>
                <button className="btn btn-primary">Save Changes</button>
            </div>
        </div>
    )
}
