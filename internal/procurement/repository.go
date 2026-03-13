package procurement

import (
	"context"
	"strings"
	"time"

	"erp-project/internal/models"

	"gorm.io/gorm"
)

// VendorStats holds aggregated metrics for a vendor from purchase requests
type VendorStats struct {
	VendorID       string  `json:"vendor_id"`
	ProjectsCount  int64   `json:"projects_count"`
	TotalValue     float64 `json:"total_value"`
	ReliabilityPct float64 `json:"reliability_pct"`
}

// ProjectVendorSummary is a vendor used on a project (from purchase requests)
type ProjectVendorSummary struct {
	VendorID   string  `json:"vendor_id"`
	VendorName string  `json:"vendor_name"`
	PRCount    int64   `json:"pr_count"`
	TotalValue float64 `json:"total_value"`
}

type Repository interface {
	// Vendor operations
	CreateVendor(ctx context.Context, vendor *models.Vendor) error
	GetVendorByID(ctx context.Context, id string) (*models.Vendor, error)
	GetAllVendors(ctx context.Context, includeInactive bool, searchQ string) ([]models.Vendor, error)
	UpdateVendor(ctx context.Context, vendor *models.Vendor) error
	DeleteVendor(ctx context.Context, id string) error
	GetVendorStatsBatch(ctx context.Context, vendorIDs []string) ([]VendorStats, error)
	GetVendorsByProject(ctx context.Context, projectID string) ([]ProjectVendorSummary, error)

	// Purchase Request operations
	CreatePurchaseRequest(ctx context.Context, pr *models.PurchaseRequest) error
	GetPurchaseRequestByID(ctx context.Context, id string) (*models.PurchaseRequest, error)
	GetPurchaseRequestsByProject(ctx context.Context, projectID string) ([]models.PurchaseRequest, error)
	GetPurchaseRequestsByStatus(ctx context.Context, status models.PurchaseRequestStatus) ([]models.PurchaseRequest, error)
	GetPurchaseRequests(ctx context.Context, filter PurchaseRequestFilter) ([]models.PurchaseRequest, error)
	GetRecentOrders(ctx context.Context, limit int) ([]models.PurchaseRequest, error)
	UpdatePurchaseRequest(ctx context.Context, pr *models.PurchaseRequest) error
	ReplacePurchaseRequestItems(ctx context.Context, purchaseRequestID string, items []models.PurchaseRequestItem) error
}

type PurchaseRequestFilter struct {
	ProjectID string
	Status    string
	Search    string
	From      *time.Time
	To        *time.Time
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

// --- Vendor operations ---

func (r *repository) CreateVendor(ctx context.Context, vendor *models.Vendor) error {
	return r.db.WithContext(ctx).Create(vendor).Error
}

func (r *repository) GetVendorByID(ctx context.Context, id string) (*models.Vendor, error) {
	var vendor models.Vendor
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&vendor).Error
	if err != nil {
		return nil, err
	}
	return &vendor, nil
}

func (r *repository) GetAllVendors(ctx context.Context, includeInactive bool, searchQ string) ([]models.Vendor, error) {
	var vendors []models.Vendor
	q := r.db.WithContext(ctx).Order("name ASC")
	if !includeInactive {
		q = q.Where("is_active = ?", true)
	}
	if searchQ != "" {
		like := "%" + strings.ToLower(strings.TrimSpace(searchQ)) + "%"
		q = q.Where("LOWER(name) LIKE ? OR LOWER(contact_name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(phone) LIKE ?", like, like, like, like)
	}
	err := q.Find(&vendors).Error
	return vendors, err
}

func (r *repository) UpdateVendor(ctx context.Context, vendor *models.Vendor) error {
	return r.db.WithContext(ctx).Save(vendor).Error
}

func (r *repository) DeleteVendor(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.Vendor{}, "id = ?", id).Error
}

func (r *repository) GetVendorStatsBatch(ctx context.Context, vendorIDs []string) ([]VendorStats, error) {
	if len(vendorIDs) == 0 {
		return nil, nil
	}
	var results []struct {
		VendorID       string  `gorm:"column:vendor_id"`
		ProjectsCount  int64   `gorm:"column:projects_count"`
		TotalValue     float64 `gorm:"column:total_value"`
		ReliabilityPct float64 `gorm:"column:reliability_pct"`
	}
	// reliability = 100 * (RECEIVED + ORDERED count) / total count; use Table+Where so IN (?) expands
	err := r.db.WithContext(ctx).Table("purchase_requests").
		Select(`vendor_id,
			COUNT(DISTINCT project_id)::bigint AS projects_count,
			COALESCE(SUM(total_price), 0)::double precision AS total_value,
			CASE WHEN COUNT(*) > 0 THEN 100.0 * SUM(CASE WHEN status IN ('RECEIVED', 'ORDERED') THEN 1 ELSE 0 END) / COUNT(*) ELSE 0 END AS reliability_pct`).
		Where("vendor_id IN ? AND deleted_at IS NULL", vendorIDs).
		Group("vendor_id").
		Scan(&results).Error
	if err != nil {
		return nil, err
	}
	stats := make([]VendorStats, len(results))
	for i := range results {
		stats[i] = VendorStats{
			VendorID:       results[i].VendorID,
			ProjectsCount:  results[i].ProjectsCount,
			TotalValue:     results[i].TotalValue,
			ReliabilityPct: results[i].ReliabilityPct,
		}
	}
	return stats, nil
}

func (r *repository) GetVendorsByProject(ctx context.Context, projectID string) ([]ProjectVendorSummary, error) {
	var results []struct {
		VendorID   string  `gorm:"column:vendor_id"`
		VendorName string  `gorm:"column:vendor_name"`
		PRCount    int64   `gorm:"column:pr_count"`
		TotalValue float64 `gorm:"column:total_value"`
	}
	err := r.db.WithContext(ctx).Table("purchase_requests").
		Select("purchase_requests.vendor_id AS vendor_id, vendors.name AS vendor_name, COUNT(*)::bigint AS pr_count, COALESCE(SUM(purchase_requests.total_price), 0)::double precision AS total_value").
		Joins("INNER JOIN vendors ON vendors.id = purchase_requests.vendor_id AND vendors.deleted_at IS NULL").
		Where("purchase_requests.project_id = ? AND purchase_requests.deleted_at IS NULL", projectID).
		Group("purchase_requests.vendor_id, vendors.name").
		Order("total_value DESC").
		Scan(&results).Error
	if err != nil {
		return nil, err
	}
	out := make([]ProjectVendorSummary, len(results))
	for i := range results {
		out[i] = ProjectVendorSummary{
			VendorID:   results[i].VendorID,
			VendorName: results[i].VendorName,
			PRCount:    results[i].PRCount,
			TotalValue: results[i].TotalValue,
		}
	}
	return out, nil
}

// --- Purchase Request operations ---

func (r *repository) CreatePurchaseRequest(ctx context.Context, pr *models.PurchaseRequest) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		items := pr.Items
		pr.Items = nil
		if err := tx.Create(pr).Error; err != nil {
			return err
		}
		if len(items) > 0 {
			for i := range items {
				items[i].PurchaseRequestID = pr.ID
			}
			if err := tx.Create(&items).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (r *repository) GetPurchaseRequestByID(ctx context.Context, id string) (*models.PurchaseRequest, error) {
	var pr models.PurchaseRequest
	err := r.db.WithContext(ctx).
		Preload("Material").
		Preload("Items").
		Preload("Items.Material").
		Preload("Project").
		Preload("Vendor").
		Preload("Requester").
		Where("id = ?", id).First(&pr).Error
	if err != nil {
		return nil, err
	}
	return &pr, nil
}

func (r *repository) GetPurchaseRequestsByProject(ctx context.Context, projectID string) ([]models.PurchaseRequest, error) {
	var prs []models.PurchaseRequest
	err := r.db.WithContext(ctx).
		Preload("Material").
		Preload("Items").
		Preload("Items.Material").
		Preload("Vendor").
		Preload("Requester").
		Where("project_id = ?", projectID).
		Order("created_at DESC").
		Find(&prs).Error
	return prs, err
}

func (r *repository) GetPurchaseRequestsByStatus(ctx context.Context, status models.PurchaseRequestStatus) ([]models.PurchaseRequest, error) {
	var prs []models.PurchaseRequest
	err := r.db.WithContext(ctx).
		Preload("Material").
		Preload("Items").
		Preload("Items.Material").
		Preload("Project").
		Preload("Vendor").
		Preload("Requester").
		Where("status = ?", status).
		Order("created_at DESC").
		Find(&prs).Error
	return prs, err
}

func (r *repository) GetPurchaseRequests(ctx context.Context, filter PurchaseRequestFilter) ([]models.PurchaseRequest, error) {
	var prs []models.PurchaseRequest
	query := r.db.WithContext(ctx).
		Model(&models.PurchaseRequest{}).
		Preload("Material").
		Preload("Items").
		Preload("Items.Material").
		Preload("Project").
		Preload("Vendor").
		Preload("Requester")

	if filter.ProjectID != "" {
		query = query.Where("project_id = ?", filter.ProjectID)
	}
	if filter.Status != "" {
		query = query.Where("status = ?", strings.ToUpper(filter.Status))
	}
	if filter.Search != "" {
		like := "%" + strings.ToLower(filter.Search) + "%"
		query = query.
			Joins("LEFT JOIN projects ON projects.id = purchase_requests.project_id").
			Joins("LEFT JOIN users AS requesters ON requesters.id = purchase_requests.requested_by").
			Where(
				"LOWER(CAST(purchase_requests.id AS TEXT)) LIKE ? OR LOWER(projects.name) LIKE ? OR LOWER(requesters.name) LIKE ? OR LOWER(requesters.email) LIKE ?",
				like, like, like, like,
			)
	}
	if filter.From != nil {
		query = query.Where("purchase_requests.created_at >= ?", *filter.From)
	}
	if filter.To != nil {
		query = query.Where("purchase_requests.created_at <= ?", *filter.To)
	}

	err := query.Order("purchase_requests.created_at DESC").Find(&prs).Error
	return prs, err
}

func (r *repository) GetRecentOrders(ctx context.Context, limit int) ([]models.PurchaseRequest, error) {
	if limit <= 0 {
		limit = 10
	}
	var prs []models.PurchaseRequest
	err := r.db.WithContext(ctx).
		Model(&models.PurchaseRequest{}).
		Preload("Material").
		Preload("Items").
		Preload("Items.Material").
		Preload("Project").
		Preload("Vendor").
		Preload("Requester").
		Where("status IN ?", []models.PurchaseRequestStatus{
			models.PurchaseRequestOrdered,
			models.PurchaseRequestReceived,
			models.PurchaseRequestRejected,
		}).
		Order("updated_at DESC").
		Limit(limit).
		Find(&prs).Error
	return prs, err
}

func (r *repository) UpdatePurchaseRequest(ctx context.Context, pr *models.PurchaseRequest) error {
	return r.db.WithContext(ctx).Save(pr).Error
}

func (r *repository) ReplacePurchaseRequestItems(ctx context.Context, purchaseRequestID string, items []models.PurchaseRequestItem) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("purchase_request_id = ?", purchaseRequestID).Delete(&models.PurchaseRequestItem{}).Error; err != nil {
			return err
		}
		if len(items) == 0 {
			return nil
		}
		for i := range items {
			items[i].PurchaseRequestID = purchaseRequestID
		}
		return tx.Create(&items).Error
	})
}
