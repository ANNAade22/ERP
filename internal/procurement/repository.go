package procurement

import (
	"context"
	"strings"
	"time"

	"erp-project/internal/models"

	"gorm.io/gorm"
)

type Repository interface {
	// Vendor operations
	CreateVendor(ctx context.Context, vendor *models.Vendor) error
	GetVendorByID(ctx context.Context, id string) (*models.Vendor, error)
	GetAllVendors(ctx context.Context) ([]models.Vendor, error)
	UpdateVendor(ctx context.Context, vendor *models.Vendor) error

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

func (r *repository) GetAllVendors(ctx context.Context) ([]models.Vendor, error) {
	var vendors []models.Vendor
	err := r.db.WithContext(ctx).Where("is_active = ?", true).Order("name ASC").Find(&vendors).Error
	return vendors, err
}

func (r *repository) UpdateVendor(ctx context.Context, vendor *models.Vendor) error {
	return r.db.WithContext(ctx).Save(vendor).Error
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
