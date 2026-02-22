package procurement

import (
	"context"

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
	UpdatePurchaseRequest(ctx context.Context, pr *models.PurchaseRequest) error
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
	return r.db.WithContext(ctx).Create(pr).Error
}

func (r *repository) GetPurchaseRequestByID(ctx context.Context, id string) (*models.PurchaseRequest, error) {
	var pr models.PurchaseRequest
	err := r.db.WithContext(ctx).
		Preload("Material").
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
		Preload("Project").
		Preload("Vendor").
		Preload("Requester").
		Where("status = ?", status).
		Order("created_at DESC").
		Find(&prs).Error
	return prs, err
}

func (r *repository) UpdatePurchaseRequest(ctx context.Context, pr *models.PurchaseRequest) error {
	return r.db.WithContext(ctx).Save(pr).Error
}
