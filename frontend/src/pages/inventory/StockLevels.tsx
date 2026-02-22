import { Pencil, Trash2 } from 'lucide-react'

const materials = [
    {
        name: 'Steel',
        category: 'Steel & Iron',
        status: 'Low Stock',
        statusBadge: 'danger',
        stockLevel: 500,
        unit: 'Tons',
        min: 5,
        max: 1000,
        supplier: 'Charles Edward',
        costPerUnit: '$25/Tons',
        avgConsumption: '30 Ton',
        lastDelivery: '2025-11-17',
    },
    {
        name: 'Steel',
        category: 'Steel & Iron',
        status: 'Low Stock',
        statusBadge: 'danger',
        stockLevel: 500,
        unit: 'Tons',
        min: 5,
        max: 1000,
        supplier: 'Carlito Ariban',
        costPerUnit: '$25/Tons',
        avgConsumption: '30 Ton',
        lastDelivery: '2025-11-17',
    },
    {
        name: 'Copper',
        category: 'Solid',
        status: 'Available',
        statusBadge: 'success',
        stockLevel: 907777,
        unit: 'Tons',
        min: 5,
        max: 5000000,
        supplier: 'Carlito Ariban',
        costPerUnit: '$10/Tons',
        avgConsumption: '50 Meter',
        lastDelivery: '2025-11-25',
    },
    {
        name: 'Cement',
        category: 'Cement & Other',
        status: 'Available',
        statusBadge: 'success',
        stockLevel: 509,
        unit: 'Tons',
        min: 25,
        max: 1000,
        supplier: 'Charles Edward',
        costPerUnit: '$80/Tons',
        avgConsumption: '20 Per Day',
        lastDelivery: '2025-11-21',
    },
]

export default function StockLevels() {
    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-info">
                    <h1>Inventory</h1>
                    <p>Track material stock and manage procurement</p>
                </div>
                <div className="page-header-actions">
                    <button className="btn btn-secondary">🛒 Create Order</button>
                    <button className="btn btn-primary">+ Add Material</button>
                </div>
            </div>

            {/* Material Cards */}
            <div className="cards-grid cols-2">
                {materials.map((material, i) => (
                    <div className="material-card" key={i}>
                        <div className="material-card-header">
                            <div>
                                <div className="material-card-name">{material.name}</div>
                                <div className="material-card-category">{material.category}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button className="btn-icon"><Pencil size={14} /></button>
                                <button className="btn-icon danger"><Trash2 size={14} /></button>
                            </div>
                        </div>

                        <div style={{ margin: 'var(--space-2) 0' }}>
                            <span className={`badge badge-${material.statusBadge}`}>
                                {material.statusBadge === 'danger' ? '⚠ ' : '✓ '}
                                {material.status}
                            </span>
                        </div>

                        <div className="material-card-stock">
                            <div className="material-card-stock-header">
                                <span className="material-card-stock-label">Stock Level</span>
                                <span className="material-card-stock-value">
                                    {material.stockLevel.toLocaleString()} {material.unit}
                                </span>
                            </div>
                            <div className="progress-bar">
                                <div
                                    className={`progress-bar-fill ${material.stockLevel / material.max < 0.3 ? 'warning' : ''
                                        }`}
                                    style={{
                                        width: `${Math.min((material.stockLevel / material.max) * 100, 100)}%`,
                                    }}
                                />
                            </div>
                            <div className="material-card-stock-range">
                                <span>Min: {material.min}</span>
                                <span>Max: {material.max.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="material-card-details">
                            <div>
                                <div className="material-card-detail-label">Supplier</div>
                                <div className="material-card-detail-value">{material.supplier}</div>
                            </div>
                            <div>
                                <div className="material-card-detail-label">Cost/Unit</div>
                                <div className="material-card-detail-value">{material.costPerUnit}</div>
                            </div>
                            <div>
                                <div className="material-card-detail-label">Avg. Consumption</div>
                                <div className="material-card-detail-value">{material.avgConsumption}</div>
                            </div>
                            <div>
                                <div className="material-card-detail-label">Last Delivery</div>
                                <div className="material-card-detail-value">{material.lastDelivery}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
