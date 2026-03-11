import {
    Phone,
    Mail,
    MapPin,
    Star,
    Pencil,
    Trash2,
} from 'lucide-react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const vendors = [
    {
        name: 'Sinar Bali',
        type: 'KSO',
        rating: 0,
        ratingLabel: '0 stars',
        status: 'Inactive',
        statusBadge: 'neutral',
        phone: '081234',
        email: 'sinarsisiseltan@gmail.com',
        location: 'KAB.BADUNGtttt',
        projects: 1,
        totalValue: 0,
        reliability: '0%',
        reliabilityColor: '',
    },
    {
        name: 'PT Amal Loponindo',
        type: 'KSO',
        rating: 5,
        ratingLabel: '5 stars',
        status: 'Preferred',
        statusBadge: 'info',
        phone: '08123',
        email: 'amal@gmail.id',
        location: 'KAB.BONE',
        projects: 3,
        totalValue: 0,
        reliability: '5%',
        reliabilityColor: 'success',
    },
]

export default function ManageContractors() {
    const startTour = () => {
        const driverObj = driver({
            showProgress: true,
            steps: [
                { element: '#vendors-header', popover: { title: 'Vendors', description: 'Manage suppliers, contractors, and service providers. Use "Take tour" anytime to see these tips again. Click Close or press Escape to skip.' } },
                { element: '#vendors-add-btn', popover: { title: 'Add Vendor', description: 'Add a new vendor or contractor to the system.' } },
                { element: '#vendors-cards', popover: { title: 'Vendor cards', description: 'Each card shows contact info, projects, total value, and reliability. Use the icons to edit or remove a vendor.' } },
            ],
            onDestroyed: () => { try { localStorage.setItem('vendors-tour-done', 'true') } catch { /* ignore */ } },
        })
        driverObj.drive()
    }

    return (
        <div>
            {/* Page Header */}
            <div id="vendors-header" className="page-header">
                <div className="page-header-info">
                    <h1>Vendors</h1>
                    <p>Manage suppliers, contractors, and service providers</p>
                </div>
                <div className="page-header-actions">
                    <button type="button" className="btn btn-secondary" onClick={startTour} title="Take a guided tour">Take tour</button>
                    <button id="vendors-add-btn" type="button" className="btn btn-primary">+ Add Vendor</button>
                </div>
            </div>

            {/* Vendor Cards */}
            <div id="vendors-cards" className="cards-grid cols-2">
                {vendors.map((vendor, i) => (
                    <div className="vendor-card" key={i}>
                        <div className="vendor-card-header">
                            <div className="vendor-card-avatar">
                                {vendor.name.charAt(0)}
                            </div>
                            <div className="vendor-card-info">
                                <div className="vendor-card-name">{vendor.name}</div>
                                <div className="vendor-card-type">{vendor.type}</div>
                                <div className="vendor-card-rating">
                                    {Array.from({ length: 5 }).map((_, si) => (
                                        <Star
                                            key={si}
                                            size={14}
                                            className={`star ${si < vendor.rating ? 'filled' : 'empty'}`}
                                            fill={si < vendor.rating ? '#f59e0b' : 'none'}
                                        />
                                    ))}
                                    <span>{vendor.ratingLabel}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                <span className={`badge badge-${vendor.statusBadge}`}>{vendor.status}</span>
                                <button className="btn-icon"><Pencil size={14} /></button>
                                <button className="btn-icon danger"><Trash2 size={14} /></button>
                            </div>
                        </div>

                        <div className="vendor-card-details">
                            <div className="vendor-card-detail">
                                <Phone size={14} /> {vendor.phone}
                            </div>
                            <div className="vendor-card-detail">
                                <Mail size={14} /> {vendor.email}
                            </div>
                            <div className="vendor-card-detail">
                                <MapPin size={14} /> {vendor.location}
                            </div>
                        </div>

                        <div className="vendor-card-stats">
                            <div>
                                <div className="vendor-card-stat-value">{vendor.projects}</div>
                                <div className="vendor-card-stat-label">Projects</div>
                            </div>
                            <div>
                                <div className="vendor-card-stat-value">{vendor.totalValue}</div>
                                <div className="vendor-card-stat-label">Total Value</div>
                            </div>
                            <div>
                                <div className={`vendor-card-stat-value ${vendor.reliabilityColor}`}>
                                    {vendor.reliability}
                                </div>
                                <div className="vendor-card-stat-label">Reliability</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
