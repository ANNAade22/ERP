package inventory

import (
	"context"
	"errors"

	"erp-project/internal/models"
)

var (
	ErrMaterialNotFound = errors.New("material not found")
	ErrInsufficientStock = errors.New("insufficient stock for this operation")
)

// --- Request DTOs ---

type CreateMaterialRequest struct {
	Name      string             `json:"name" binding:"required"`
	Unit      models.MaterialUnit `json:"unit" binding:"required"`
	MinStock  float64            `json:"min_stock" binding:"gte=0"`
	ProjectID string             `json:"project_id" binding:"required"`
}

type StockInRequest struct {
	MaterialID  string  `json:"material_id" binding:"required"`
	ProjectID   string  `json:"project_id" binding:"required"`
	Quantity    float64 `json:"quantity" binding:"required,gt=0"`
	Reason      string  `json:"reason"`
	ReferenceID string  `json:"reference_id"` // Optional PurchaseRequest ID
}

type StockOutRequest struct {
	MaterialID string  `json:"material_id" binding:"required"`
	ProjectID  string  `json:"project_id" binding:"required"`
	Quantity   float64 `json:"quantity" binding:"required,gt=0"`
	Reason     string  `json:"reason" binding:"required"`
}

// --- Service interface ---

type Service interface {
	CreateMaterial(ctx context.Context, req CreateMaterialRequest) (*models.Material, error)
	DeleteMaterial(ctx context.Context, id string) error
	GetMaterialsByProject(ctx context.Context, projectID string) ([]models.Material, error)
	GetMaterialByID(ctx context.Context, id string) (*models.Material, error)
	StockIn(ctx context.Context, req StockInRequest, performedBy string) (*models.StockMovement, error)
	StockOut(ctx context.Context, req StockOutRequest, performedBy string) (*models.StockMovement, error)
	GetStockMovements(ctx context.Context, materialID string) ([]models.StockMovement, error)
	GetLowStockAlerts(ctx context.Context, projectID string) ([]models.Material, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreateMaterial(ctx context.Context, req CreateMaterialRequest) (*models.Material, error) {
	material := &models.Material{
		Name:         req.Name,
		Unit:         req.Unit,
		CurrentStock: 0,
		MinStock:     req.MinStock,
		ProjectID:    req.ProjectID,
	}

	err := s.repo.CreateMaterial(ctx, material)
	if err != nil {
		return nil, err
	}

	return s.repo.GetMaterialByID(ctx, material.ID)
}

func (s *service) DeleteMaterial(ctx context.Context, id string) error {
	_, err := s.repo.GetMaterialByID(ctx, id)
	if err != nil {
		return ErrMaterialNotFound
	}
	return s.repo.DeleteMaterial(ctx, id)
}

func (s *service) GetMaterialsByProject(ctx context.Context, projectID string) ([]models.Material, error) {
	return s.repo.GetMaterialsByProject(ctx, projectID)
}

func (s *service) GetMaterialByID(ctx context.Context, id string) (*models.Material, error) {
	material, err := s.repo.GetMaterialByID(ctx, id)
	if err != nil {
		return nil, ErrMaterialNotFound
	}
	return material, nil
}

func (s *service) StockIn(ctx context.Context, req StockInRequest, performedBy string) (*models.StockMovement, error) {
	material, err := s.repo.GetMaterialByID(ctx, req.MaterialID)
	if err != nil {
		return nil, ErrMaterialNotFound
	}

	// Update stock
	material.CurrentStock += req.Quantity
	err = s.repo.UpdateMaterial(ctx, material)
	if err != nil {
		return nil, err
	}

	// Log movement
	movement := &models.StockMovement{
		MaterialID:   req.MaterialID,
		ProjectID:    req.ProjectID,
		MovementType: models.MovementTypeIn,
		Quantity:     req.Quantity,
		Reason:       req.Reason,
		PerformedBy:  performedBy,
	}

	if req.ReferenceID != "" {
		movement.ReferenceID = &req.ReferenceID
	}

	err = s.repo.CreateStockMovement(ctx, movement)
	if err != nil {
		return nil, err
	}

	return movement, nil
}

func (s *service) StockOut(ctx context.Context, req StockOutRequest, performedBy string) (*models.StockMovement, error) {
	material, err := s.repo.GetMaterialByID(ctx, req.MaterialID)
	if err != nil {
		return nil, ErrMaterialNotFound
	}

	// Validate sufficient stock
	if material.CurrentStock < req.Quantity {
		return nil, ErrInsufficientStock
	}

	// Update stock
	material.CurrentStock -= req.Quantity
	err = s.repo.UpdateMaterial(ctx, material)
	if err != nil {
		return nil, err
	}

	// Log movement
	movement := &models.StockMovement{
		MaterialID:   req.MaterialID,
		ProjectID:    req.ProjectID,
		MovementType: models.MovementTypeOut,
		Quantity:     req.Quantity,
		Reason:       req.Reason,
		PerformedBy:  performedBy,
	}

	err = s.repo.CreateStockMovement(ctx, movement)
	if err != nil {
		return nil, err
	}

	return movement, nil
}

func (s *service) GetStockMovements(ctx context.Context, materialID string) ([]models.StockMovement, error) {
	return s.repo.GetStockMovementsByMaterial(ctx, materialID)
}

func (s *service) GetLowStockAlerts(ctx context.Context, projectID string) ([]models.Material, error) {
	return s.repo.GetLowStockMaterials(ctx, projectID)
}
