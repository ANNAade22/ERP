package inventory

import (
	"context"

	"erp-project/internal/models"

	"gorm.io/gorm"
)

type Repository interface {
	// Material operations
	CreateMaterial(ctx context.Context, material *models.Material) error
	GetMaterialByID(ctx context.Context, id string) (*models.Material, error)
	GetMaterialsByProject(ctx context.Context, projectID string) ([]models.Material, error)
	UpdateMaterial(ctx context.Context, material *models.Material) error
	DeleteMaterial(ctx context.Context, id string) error

	// Stock Movement operations
	CreateStockMovement(ctx context.Context, movement *models.StockMovement) error
	GetStockMovementsByMaterial(ctx context.Context, materialID string) ([]models.StockMovement, error)
	GetStockMovementsByProject(ctx context.Context, projectID string) ([]models.StockMovement, error)

	// Low stock query
	GetLowStockMaterials(ctx context.Context, projectID string) ([]models.Material, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

// --- Material operations ---

func (r *repository) CreateMaterial(ctx context.Context, material *models.Material) error {
	return r.db.WithContext(ctx).Create(material).Error
}

func (r *repository) GetMaterialByID(ctx context.Context, id string) (*models.Material, error) {
	var material models.Material
	err := r.db.WithContext(ctx).Preload("Project").Where("id = ?", id).First(&material).Error
	if err != nil {
		return nil, err
	}
	return &material, nil
}

func (r *repository) GetMaterialsByProject(ctx context.Context, projectID string) ([]models.Material, error) {
	var materials []models.Material
	err := r.db.WithContext(ctx).Where("project_id = ?", projectID).Order("name ASC").Find(&materials).Error
	return materials, err
}

func (r *repository) UpdateMaterial(ctx context.Context, material *models.Material) error {
	return r.db.WithContext(ctx).Save(material).Error
}

func (r *repository) DeleteMaterial(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&models.Material{}, "id = ?", id).Error
}

// --- Stock Movement operations ---

func (r *repository) CreateStockMovement(ctx context.Context, movement *models.StockMovement) error {
	return r.db.WithContext(ctx).Create(movement).Error
}

func (r *repository) GetStockMovementsByMaterial(ctx context.Context, materialID string) ([]models.StockMovement, error) {
	var movements []models.StockMovement
	err := r.db.WithContext(ctx).
		Preload("Material").
		Where("material_id = ?", materialID).
		Order("created_at DESC").
		Find(&movements).Error
	return movements, err
}

func (r *repository) GetStockMovementsByProject(ctx context.Context, projectID string) ([]models.StockMovement, error) {
	var movements []models.StockMovement
	err := r.db.WithContext(ctx).
		Preload("Material").
		Where("project_id = ?", projectID).
		Order("created_at DESC").
		Find(&movements).Error
	return movements, err
}

// --- Low stock query ---

func (r *repository) GetLowStockMaterials(ctx context.Context, projectID string) ([]models.Material, error) {
	var materials []models.Material
	err := r.db.WithContext(ctx).
		Where("project_id = ? AND current_stock <= min_stock AND min_stock > 0", projectID).
		Find(&materials).Error
	return materials, err
}
