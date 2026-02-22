package procurement

import (
	"context"
	"errors"

	"erp-project/internal/models"
)

var (
	ErrVendorNotFound          = errors.New("vendor not found")
	ErrPurchaseRequestNotFound = errors.New("purchase request not found")
)

// --- Request DTOs ---

type CreateVendorRequest struct {
	Name        string `json:"name" binding:"required"`
	ContactName string `json:"contact_name"`
	Phone       string `json:"phone"`
	Email       string `json:"email"`
	Address     string `json:"address"`
	GSTNumber   string `json:"gst_number"`
}

type UpdateVendorRequest struct {
	Name        *string `json:"name"`
	ContactName *string `json:"contact_name"`
	Phone       *string `json:"phone"`
	Email       *string `json:"email"`
	Address     *string `json:"address"`
	GSTNumber   *string `json:"gst_number"`
	IsActive    *bool   `json:"is_active"`
}

type CreatePurchaseRequestDTO struct {
	MaterialID string  `json:"material_id" binding:"required"`
	ProjectID  string  `json:"project_id" binding:"required"`
	VendorID   string  `json:"vendor_id"`
	Quantity   float64 `json:"quantity" binding:"required,gt=0"`
	UnitPrice  float64 `json:"unit_price" binding:"gte=0"`
	Notes      string  `json:"notes"`
}

type UpdatePurchaseRequestStatusDTO struct {
	Status models.PurchaseRequestStatus `json:"status" binding:"required"`
}

// --- Service interface ---

type Service interface {
	// Vendors
	CreateVendor(ctx context.Context, req CreateVendorRequest) (*models.Vendor, error)
	GetAllVendors(ctx context.Context) ([]models.Vendor, error)
	GetVendorByID(ctx context.Context, id string) (*models.Vendor, error)
	UpdateVendor(ctx context.Context, id string, req UpdateVendorRequest) (*models.Vendor, error)

	// Purchase Requests
	CreatePurchaseRequest(ctx context.Context, req CreatePurchaseRequestDTO, requestedBy string) (*models.PurchaseRequest, error)
	GetPurchaseRequestByID(ctx context.Context, id string) (*models.PurchaseRequest, error)
	GetPurchaseRequestsByProject(ctx context.Context, projectID string) ([]models.PurchaseRequest, error)
	GetPendingPurchaseRequests(ctx context.Context) ([]models.PurchaseRequest, error)
	UpdatePurchaseRequestStatus(ctx context.Context, id string, req UpdatePurchaseRequestStatusDTO, approvedBy string) (*models.PurchaseRequest, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// --- Vendor methods ---

func (s *service) CreateVendor(ctx context.Context, req CreateVendorRequest) (*models.Vendor, error) {
	vendor := &models.Vendor{
		Name:        req.Name,
		ContactName: req.ContactName,
		Phone:       req.Phone,
		Email:       req.Email,
		Address:     req.Address,
		GSTNumber:   req.GSTNumber,
		IsActive:    true,
	}
	err := s.repo.CreateVendor(ctx, vendor)
	if err != nil {
		return nil, err
	}
	return vendor, nil
}

func (s *service) GetAllVendors(ctx context.Context) ([]models.Vendor, error) {
	return s.repo.GetAllVendors(ctx)
}

func (s *service) GetVendorByID(ctx context.Context, id string) (*models.Vendor, error) {
	vendor, err := s.repo.GetVendorByID(ctx, id)
	if err != nil {
		return nil, ErrVendorNotFound
	}
	return vendor, nil
}

func (s *service) UpdateVendor(ctx context.Context, id string, req UpdateVendorRequest) (*models.Vendor, error) {
	vendor, err := s.repo.GetVendorByID(ctx, id)
	if err != nil {
		return nil, ErrVendorNotFound
	}

	if req.Name != nil {
		vendor.Name = *req.Name
	}
	if req.ContactName != nil {
		vendor.ContactName = *req.ContactName
	}
	if req.Phone != nil {
		vendor.Phone = *req.Phone
	}
	if req.Email != nil {
		vendor.Email = *req.Email
	}
	if req.Address != nil {
		vendor.Address = *req.Address
	}
	if req.GSTNumber != nil {
		vendor.GSTNumber = *req.GSTNumber
	}
	if req.IsActive != nil {
		vendor.IsActive = *req.IsActive
	}

	err = s.repo.UpdateVendor(ctx, vendor)
	if err != nil {
		return nil, err
	}
	return vendor, nil
}

// --- Purchase Request methods ---

func (s *service) CreatePurchaseRequest(ctx context.Context, req CreatePurchaseRequestDTO, requestedBy string) (*models.PurchaseRequest, error) {
	pr := &models.PurchaseRequest{
		MaterialID:  req.MaterialID,
		ProjectID:   req.ProjectID,
		Quantity:    req.Quantity,
		UnitPrice:   req.UnitPrice,
		TotalPrice:  req.Quantity * req.UnitPrice,
		Status:      models.PurchaseRequestPending,
		Notes:       req.Notes,
		RequestedBy: requestedBy,
	}

	if req.VendorID != "" {
		pr.VendorID = &req.VendorID
	}

	err := s.repo.CreatePurchaseRequest(ctx, pr)
	if err != nil {
		return nil, err
	}

	return s.repo.GetPurchaseRequestByID(ctx, pr.ID)
}

func (s *service) GetPurchaseRequestByID(ctx context.Context, id string) (*models.PurchaseRequest, error) {
	pr, err := s.repo.GetPurchaseRequestByID(ctx, id)
	if err != nil {
		return nil, ErrPurchaseRequestNotFound
	}
	return pr, nil
}

func (s *service) GetPurchaseRequestsByProject(ctx context.Context, projectID string) ([]models.PurchaseRequest, error) {
	return s.repo.GetPurchaseRequestsByProject(ctx, projectID)
}

func (s *service) GetPendingPurchaseRequests(ctx context.Context) ([]models.PurchaseRequest, error) {
	return s.repo.GetPurchaseRequestsByStatus(ctx, models.PurchaseRequestPending)
}

func (s *service) UpdatePurchaseRequestStatus(ctx context.Context, id string, req UpdatePurchaseRequestStatusDTO, approvedBy string) (*models.PurchaseRequest, error) {
	pr, err := s.repo.GetPurchaseRequestByID(ctx, id)
	if err != nil {
		return nil, ErrPurchaseRequestNotFound
	}

	pr.Status = req.Status
	if req.Status == models.PurchaseRequestApproved {
		pr.ApprovedBy = &approvedBy
	}

	err = s.repo.UpdatePurchaseRequest(ctx, pr)
	if err != nil {
		return nil, err
	}

	return s.repo.GetPurchaseRequestByID(ctx, pr.ID)
}
