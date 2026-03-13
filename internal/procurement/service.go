package procurement

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"erp-project/internal/models"
)

var (
	ErrVendorNotFound          = errors.New("vendor not found")
	ErrPurchaseRequestNotFound = errors.New("purchase request not found")
	ErrInvalidTransition       = errors.New("invalid purchase request status transition")
	ErrStatusActionForbidden   = errors.New("you do not have permission for this status change")
	ErrEditNotAllowed          = errors.New("request can only be edited while pending")
	ErrItemsRequired           = errors.New("at least one material item is required")
)

// --- Request DTOs ---

type CreateVendorRequest struct {
	Name        string `json:"name" binding:"required"`
	ContactName string `json:"contact_name"`
	Phone       string `json:"phone"`
	Email       string `json:"email"`
	Address     string `json:"address"`
	GSTNumber   string `json:"gst_number"`
	Type        string `json:"type"`        // e.g. KSO, Supplier, Contractor (Category in UI)
	Status      string `json:"status"`      // ACTIVE, PREFERRED, INACTIVE
	Rating      int    `json:"rating"`      // 0-5
	Description string `json:"description"` // short description
}

type UpdateVendorRequest struct {
	Name        *string `json:"name"`
	ContactName *string `json:"contact_name"`
	Phone       *string `json:"phone"`
	Email       *string `json:"email"`
	Address     *string `json:"address"`
	GSTNumber   *string `json:"gst_number"`
	IsActive    *bool   `json:"is_active"`
	Type        *string `json:"type"`
	Status      *string `json:"status"`
	Rating      *int    `json:"rating"`
	Description *string `json:"description"`
}

type CreatePurchaseRequestDTO struct {
	MaterialID string  `json:"material_id"`
	ProjectID  string  `json:"project_id" binding:"required"`
	VendorID   string  `json:"vendor_id"`
	Quantity   float64 `json:"quantity"`
	UnitPrice  float64 `json:"unit_price" binding:"gte=0"`
	Notes      string  `json:"notes"`
	Items      []PurchaseRequestItemDTO `json:"items"`
}

type PurchaseRequestItemDTO struct {
	MaterialID string  `json:"material_id" binding:"required"`
	Quantity   float64 `json:"quantity" binding:"required,gt=0"`
	UnitPrice  float64 `json:"unit_price" binding:"gte=0"`
}

type UpdatePurchaseRequestStatusDTO struct {
	Status models.PurchaseRequestStatus `json:"status" binding:"required"`
}

type UpdatePurchaseRequestDTO struct {
	Quantity  *float64 `json:"quantity" binding:"omitempty,gt=0"`
	UnitPrice *float64 `json:"unit_price" binding:"omitempty,gte=0"`
	VendorID  *string  `json:"vendor_id"`
	Notes     *string  `json:"notes"`
	Items     []PurchaseRequestItemDTO `json:"items"`
}

type PurchaseRequestListFilter struct {
	ProjectID string
	Status    string
	Search    string
	From      string
	To        string
}

// VendorWithStats extends Vendor with aggregated metrics from purchase requests
type VendorWithStats struct {
	models.Vendor
	ProjectsCount  int64   `json:"projects_count"`
	TotalValue     float64 `json:"total_value"`
	ReliabilityPct float64 `json:"reliability_pct"`
}

type RecentOrderDTO struct {
	OrderID          string                         `json:"order_id"`
	Supplier         string                         `json:"supplier"`
	OrderDate        time.Time                      `json:"order_date"`
	Items            int                            `json:"items"`
	Status           models.PurchaseRequestStatus   `json:"status"`
	ExpectedDelivery *time.Time                     `json:"expected_delivery,omitempty"`
	ProjectName      string                         `json:"project_name"`
	TotalValue       float64                        `json:"total_value"`
}

// --- Service interface ---

type Service interface {
	// Vendors
	CreateVendor(ctx context.Context, req CreateVendorRequest) (*models.Vendor, error)
	GetAllVendors(ctx context.Context, includeInactive bool, searchQ string) ([]VendorWithStats, error)
	GetVendorByID(ctx context.Context, id string) (*VendorWithStats, error)
	UpdateVendor(ctx context.Context, id string, req UpdateVendorRequest) (*models.Vendor, error)
	DeleteVendor(ctx context.Context, id string) error
	GetVendorsByProject(ctx context.Context, projectID string) ([]ProjectVendorSummary, error)

	// Purchase Requests
	CreatePurchaseRequest(ctx context.Context, req CreatePurchaseRequestDTO, requestedBy string) (*models.PurchaseRequest, error)
	GetPurchaseRequestByID(ctx context.Context, id string) (*models.PurchaseRequest, error)
	GetPurchaseRequestsByProject(ctx context.Context, projectID string) ([]models.PurchaseRequest, error)
	GetPurchaseRequests(ctx context.Context, filter PurchaseRequestListFilter, userID string, userRole models.Role) ([]models.PurchaseRequest, error)
	GetRecentOrders(ctx context.Context, limit int) ([]RecentOrderDTO, error)
	GetPendingPurchaseRequests(ctx context.Context) ([]models.PurchaseRequest, error)
	UpdatePurchaseRequest(ctx context.Context, id string, req UpdatePurchaseRequestDTO) (*models.PurchaseRequest, error)
	UpdatePurchaseRequestStatus(ctx context.Context, id string, req UpdatePurchaseRequestStatusDTO, approvedBy string, actorRole models.Role) (*models.PurchaseRequest, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// --- Vendor methods ---

func (s *service) CreateVendor(ctx context.Context, req CreateVendorRequest) (*models.Vendor, error) {
	status := models.VendorStatusActive
	if req.Status != "" {
		switch strings.ToUpper(req.Status) {
		case "PREFERRED":
			status = models.VendorStatusPreferred
		case "INACTIVE":
			status = models.VendorStatusInactive
		default:
			status = models.VendorStatusActive
		}
	}
	rating := req.Rating
	if rating < 0 {
		rating = 0
	}
	if rating > 5 {
		rating = 5
	}
	vendor := &models.Vendor{
		Name:        req.Name,
		ContactName: req.ContactName,
		Phone:       req.Phone,
		Email:       req.Email,
		Address:     req.Address,
		GSTNumber:   req.GSTNumber,
		Type:        req.Type,
		Status:      status,
		Rating:      rating,
		Description: req.Description,
		IsActive:    status != models.VendorStatusInactive,
	}
	err := s.repo.CreateVendor(ctx, vendor)
	if err != nil {
		return nil, err
	}
	return vendor, nil
}

func (s *service) GetAllVendors(ctx context.Context, includeInactive bool, searchQ string) ([]VendorWithStats, error) {
	vendors, err := s.repo.GetAllVendors(ctx, includeInactive, searchQ)
	if err != nil {
		return nil, err
	}
	if len(vendors) == 0 {
		return []VendorWithStats{}, nil
	}
	ids := make([]string, 0, len(vendors))
	for i := range vendors {
		ids = append(ids, vendors[i].ID)
	}
	statsList, err := s.repo.GetVendorStatsBatch(ctx, ids)
	if err != nil {
		return nil, err
	}
	statsMap := make(map[string]VendorStats)
	for i := range statsList {
		statsMap[statsList[i].VendorID] = statsList[i]
	}
	out := make([]VendorWithStats, len(vendors))
	for i := range vendors {
		out[i] = VendorWithStats{
			Vendor:         vendors[i],
			ProjectsCount:  0,
			TotalValue:     0,
			ReliabilityPct: 0,
		}
		if st, ok := statsMap[vendors[i].ID]; ok {
			out[i].ProjectsCount = st.ProjectsCount
			out[i].TotalValue = st.TotalValue
			out[i].ReliabilityPct = st.ReliabilityPct
		}
	}
	return out, nil
}

func (s *service) GetVendorByID(ctx context.Context, id string) (*VendorWithStats, error) {
	vendor, err := s.repo.GetVendorByID(ctx, id)
	if err != nil {
		return nil, ErrVendorNotFound
	}
	statsList, err := s.repo.GetVendorStatsBatch(ctx, []string{id})
	if err != nil {
		return nil, err
	}
	out := &VendorWithStats{Vendor: *vendor}
	for i := range statsList {
		if statsList[i].VendorID == id {
			out.ProjectsCount = statsList[i].ProjectsCount
			out.TotalValue = statsList[i].TotalValue
			out.ReliabilityPct = statsList[i].ReliabilityPct
			break
		}
	}
	return out, nil
}

func (s *service) DeleteVendor(ctx context.Context, id string) error {
	_, err := s.repo.GetVendorByID(ctx, id)
	if err != nil {
		return ErrVendorNotFound
	}
	return s.repo.DeleteVendor(ctx, id)
}

func (s *service) GetVendorsByProject(ctx context.Context, projectID string) ([]ProjectVendorSummary, error) {
	return s.repo.GetVendorsByProject(ctx, projectID)
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
	if req.Type != nil {
		vendor.Type = *req.Type
	}
	if req.Status != nil {
		switch strings.ToUpper(*req.Status) {
		case "PREFERRED":
			vendor.Status = models.VendorStatusPreferred
		case "INACTIVE":
			vendor.Status = models.VendorStatusInactive
		default:
			vendor.Status = models.VendorStatusActive
		}
		vendor.IsActive = vendor.Status != models.VendorStatusInactive
	}
	if req.Rating != nil {
		r := *req.Rating
		if r < 0 {
			r = 0
		}
		if r > 5 {
			r = 5
		}
		vendor.Rating = r
	}
	if req.Description != nil {
		vendor.Description = *req.Description
	}

	err = s.repo.UpdateVendor(ctx, vendor)
	if err != nil {
		return nil, err
	}
	return vendor, nil
}

// --- Purchase Request methods ---

func (s *service) CreatePurchaseRequest(ctx context.Context, req CreatePurchaseRequestDTO, requestedBy string) (*models.PurchaseRequest, error) {
	itemDTOs := req.Items
	// Backward compatibility with old single-item payloads.
	if len(itemDTOs) == 0 && req.MaterialID != "" && req.Quantity > 0 {
		itemDTOs = []PurchaseRequestItemDTO{
			{
				MaterialID: req.MaterialID,
				Quantity:   req.Quantity,
				UnitPrice:  req.UnitPrice,
			},
		}
	}
	if len(itemDTOs) == 0 {
		return nil, ErrItemsRequired
	}

	items := make([]models.PurchaseRequestItem, 0, len(itemDTOs))
	totalPrice := 0.0
	totalQty := 0.0
	for _, it := range itemDTOs {
		if strings.TrimSpace(it.MaterialID) == "" || it.Quantity <= 0 || it.UnitPrice < 0 {
			return nil, fmt.Errorf("invalid item payload")
		}
		lineTotal := it.Quantity * it.UnitPrice
		items = append(items, models.PurchaseRequestItem{
			MaterialID: it.MaterialID,
			Quantity:   it.Quantity,
			UnitPrice:  it.UnitPrice,
			TotalPrice: lineTotal,
		})
		totalPrice += lineTotal
		totalQty += it.Quantity
	}
	first := items[0]

	pr := &models.PurchaseRequest{
		MaterialID:  first.MaterialID,
		ProjectID:   req.ProjectID,
		Quantity:    totalQty,
		UnitPrice:   first.UnitPrice,
		TotalPrice:  totalPrice,
		Items:       items,
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

func (s *service) GetPurchaseRequests(ctx context.Context, filter PurchaseRequestListFilter, userID string, userRole models.Role) ([]models.PurchaseRequest, error) {
	var fromPtr, toPtr *time.Time
	if filter.From != "" {
		parsedFrom, err := time.Parse("2006-01-02", filter.From)
		if err != nil {
			return nil, fmt.Errorf("invalid from date format (expected YYYY-MM-DD)")
		}
		fromPtr = &parsedFrom
	}
	if filter.To != "" {
		parsedTo, err := time.Parse("2006-01-02", filter.To)
		if err != nil {
			return nil, fmt.Errorf("invalid to date format (expected YYYY-MM-DD)")
		}
		parsedTo = parsedTo.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
		toPtr = &parsedTo
	}

	prs, err := s.repo.GetPurchaseRequests(ctx, PurchaseRequestFilter{
		ProjectID: filter.ProjectID,
		Status:    strings.ToUpper(filter.Status),
		Search:    filter.Search,
		From:      fromPtr,
		To:        toPtr,
	})
	if err != nil {
		return nil, err
	}

	// Role-safe trimming: site engineers only see their own requests.
	if userRole == models.RoleSiteEngineer {
		own := make([]models.PurchaseRequest, 0, len(prs))
		for _, pr := range prs {
			if pr.RequestedBy == userID {
				own = append(own, pr)
			}
		}
		return own, nil
	}
	return prs, nil
}

func (s *service) GetRecentOrders(ctx context.Context, limit int) ([]RecentOrderDTO, error) {
	prs, err := s.repo.GetRecentOrders(ctx, limit)
	if err != nil {
		return nil, err
	}
	result := make([]RecentOrderDTO, 0, len(prs))
	for _, pr := range prs {
		var expected *time.Time
		if pr.Status == models.PurchaseRequestOrdered {
			t := pr.UpdatedAt.AddDate(0, 0, 7)
			expected = &t
		}
		supplier := "Unassigned"
		if pr.Vendor != nil && pr.Vendor.Name != "" {
			supplier = pr.Vendor.Name
		}
		projectName := ""
		if pr.Project != nil {
			projectName = pr.Project.Name
		}
		itemCount := 1
		if len(pr.Items) > 0 {
			itemCount = len(pr.Items)
		}
		result = append(result, RecentOrderDTO{
			OrderID:          pr.ID,
			Supplier:         supplier,
			OrderDate:        pr.CreatedAt,
			Items:            itemCount,
			Status:           pr.Status,
			ExpectedDelivery: expected,
			ProjectName:      projectName,
			TotalValue:       pr.TotalPrice,
		})
	}
	return result, nil
}

func (s *service) GetPendingPurchaseRequests(ctx context.Context) ([]models.PurchaseRequest, error) {
	return s.repo.GetPurchaseRequestsByStatus(ctx, models.PurchaseRequestPending)
}

func (s *service) UpdatePurchaseRequest(ctx context.Context, id string, req UpdatePurchaseRequestDTO) (*models.PurchaseRequest, error) {
	pr, err := s.repo.GetPurchaseRequestByID(ctx, id)
	if err != nil {
		return nil, ErrPurchaseRequestNotFound
	}
	if pr.Status != models.PurchaseRequestPending {
		return nil, ErrEditNotAllowed
	}
	if req.Quantity != nil {
		pr.Quantity = *req.Quantity
	}
	if req.UnitPrice != nil {
		pr.UnitPrice = *req.UnitPrice
	}
	if req.VendorID != nil {
		if *req.VendorID == "" {
			pr.VendorID = nil
		} else {
			pr.VendorID = req.VendorID
		}
	}
	if req.Notes != nil {
		pr.Notes = *req.Notes
	}

	if len(req.Items) > 0 {
		items := make([]models.PurchaseRequestItem, 0, len(req.Items))
		totalPrice := 0.0
		totalQty := 0.0
		for _, it := range req.Items {
			if strings.TrimSpace(it.MaterialID) == "" || it.Quantity <= 0 || it.UnitPrice < 0 {
				return nil, fmt.Errorf("invalid item payload")
			}
			lineTotal := it.Quantity * it.UnitPrice
			items = append(items, models.PurchaseRequestItem{
				MaterialID: it.MaterialID,
				Quantity:   it.Quantity,
				UnitPrice:  it.UnitPrice,
				TotalPrice: lineTotal,
			})
			totalPrice += lineTotal
			totalQty += it.Quantity
		}
		first := items[0]
		if err := s.repo.ReplacePurchaseRequestItems(ctx, pr.ID, items); err != nil {
			return nil, err
		}
		pr.MaterialID = first.MaterialID
		pr.Quantity = totalQty
		pr.UnitPrice = first.UnitPrice
		pr.TotalPrice = totalPrice
	} else {
		pr.TotalPrice = pr.Quantity * pr.UnitPrice
	}

	if err := s.repo.UpdatePurchaseRequest(ctx, pr); err != nil {
		return nil, err
	}
	return s.repo.GetPurchaseRequestByID(ctx, pr.ID)
}

func canTransitionStatus(from, to models.PurchaseRequestStatus) bool {
	switch from {
	case models.PurchaseRequestPending:
		return to == models.PurchaseRequestApproved || to == models.PurchaseRequestRejected
	case models.PurchaseRequestApproved:
		return to == models.PurchaseRequestOrdered
	case models.PurchaseRequestOrdered:
		return to == models.PurchaseRequestReceived
	default:
		return false
	}
}

func canRoleSetStatus(role models.Role, status models.PurchaseRequestStatus) bool {
	switch status {
	case models.PurchaseRequestApproved, models.PurchaseRequestRejected:
		return role == models.RoleAdmin || role == models.RoleProjectManager
	case models.PurchaseRequestOrdered, models.PurchaseRequestReceived:
		return role == models.RoleAdmin || role == models.RoleStoreOfficer
	default:
		return false
	}
}

func (s *service) UpdatePurchaseRequestStatus(ctx context.Context, id string, req UpdatePurchaseRequestStatusDTO, approvedBy string, actorRole models.Role) (*models.PurchaseRequest, error) {
	pr, err := s.repo.GetPurchaseRequestByID(ctx, id)
	if err != nil {
		return nil, ErrPurchaseRequestNotFound
	}

	if !canRoleSetStatus(actorRole, req.Status) {
		return nil, ErrStatusActionForbidden
	}
	if !canTransitionStatus(pr.Status, req.Status) {
		return nil, ErrInvalidTransition
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
