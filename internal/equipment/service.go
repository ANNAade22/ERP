package equipment

import (
	"context"
	"errors"
	"fmt"
	"time"

	"erp-project/internal/models"
	"erp-project/internal/projects"
	"erp-project/internal/users"
)

var (
	ErrEquipmentNotFound   = errors.New("equipment not found")
	ErrMaintenanceNotFound = errors.New("maintenance task not found")
	ErrScheduleNotFound    = errors.New("schedule not found")
)

type CreateEquipmentRequest struct {
	Name         string              `json:"name" binding:"required"`
	Type         models.EquipmentType `json:"type" binding:"required"`
	Manufacturer string              `json:"manufacturer"`
	Model        string              `json:"model"`
	SerialNumber string              `json:"serial_number"`
	PurchaseDate string              `json:"purchase_date"` // YYYY-MM-DD
	Location     string              `json:"location"`
	Notes        string              `json:"notes"`
	ProjectID    *string             `json:"project_id"`
}

type UpdateEquipmentRequest struct {
	Name         *string              `json:"name"`
	Type         *models.EquipmentType `json:"type"`
	Manufacturer *string              `json:"manufacturer"`
	Model        *string              `json:"model"`
	SerialNumber *string              `json:"serial_number"`
	PurchaseDate *string              `json:"purchase_date"`
	Status       *models.EquipmentStatus `json:"status"`
	Location     *string              `json:"location"`
	Notes        *string              `json:"notes"`
	ProjectID    *string             `json:"project_id"`
}

type CreateMaintenanceRequest struct {
	Type            models.MaintenanceType `json:"type" binding:"required"`
	ScheduledAt     string                 `json:"scheduled_at" binding:"required"` // YYYY-MM-DD
	AssignedTo      string                 `json:"assigned_to"`
	EstimatedHours  float64                `json:"estimated_hours"`
}

type UpdateMaintenanceRequest struct {
	ScheduledAt *string                 `json:"scheduled_at"`
	Status      *models.MaintenanceStatus `json:"status"`
}

type CreateScheduleRequest struct {
	ProjectID    string `json:"project_id" binding:"required"`
	EquipmentID   string `json:"equipment_id" binding:"required"`
	OperatorName string `json:"operator_name" binding:"required"`
	ScheduleDate string `json:"schedule_date" binding:"required"` // YYYY-MM-DD
}

type UpdateScheduleRequest struct {
	ProjectID    *string `json:"project_id"`
	EquipmentID  *string `json:"equipment_id"`
	OperatorName *string `json:"operator_name"`
	ScheduleDate *string `json:"schedule_date"` // YYYY-MM-DD
}

type DashboardResponse struct {
	TotalEquipment    int64                  `json:"total_equipment"`
	Available         int64                  `json:"available"`
	UnderMaintenance  int64                  `json:"under_maintenance"`
	CriticalAlerts    int64                  `json:"critical_alerts"`
	UpcomingMaintenance []UpcomingMaintenanceItem `json:"upcoming_maintenance"`
}

type UpcomingMaintenanceItem struct {
	ID               string `json:"id"`
	EquipmentName    string `json:"equipment_name"`
	Type             string `json:"type"`
	AssignedTo       string `json:"assigned_to"`        // user ID (for compatibility)
	AssignedToName   string `json:"assigned_to_name"`  // resolved display name
	Date             string `json:"date"`
	Hours            string `json:"hours"`
	Status           string `json:"status"`             // for frontend to hide Cancel/Complete when done
}

type ScheduledItemResponse struct {
	ID            string `json:"id"`
	ProjectID     string `json:"project_id"`
	ProjectName   string `json:"project_name"`
	EquipmentID   string `json:"equipment_id"`
	EquipmentName string `json:"equipment_name"`
	OperatorName  string `json:"operator_name"`
	ScheduleDate  string `json:"schedule_date"`
}

type Service interface {
	CreateEquipment(ctx context.Context, req CreateEquipmentRequest) (*models.Equipment, error)
	GetEquipmentByID(ctx context.Context, id string) (*models.Equipment, error)
	ListEquipment(ctx context.Context, status, projectID string) ([]models.Equipment, error)
	UpdateEquipment(ctx context.Context, id string, req UpdateEquipmentRequest) (*models.Equipment, error)
	DeleteEquipment(ctx context.Context, id string) error

	CreateMaintenance(ctx context.Context, equipmentID string, req CreateMaintenanceRequest) (*models.MaintenanceTask, error)
	GetMaintenanceByID(ctx context.Context, id string) (*models.MaintenanceTask, error)
	ListMaintenanceByEquipment(ctx context.Context, equipmentID string) ([]models.MaintenanceTask, error)
	UpdateMaintenance(ctx context.Context, id string, req UpdateMaintenanceRequest) (*models.MaintenanceTask, error)
	DeleteMaintenance(ctx context.Context, id string) error

	GetDashboard(ctx context.Context) (*DashboardResponse, error)
	ListScheduled(ctx context.Context) ([]ScheduledItemResponse, error)
	CreateSchedule(ctx context.Context, req CreateScheduleRequest) (*models.EquipmentSchedule, error)
	UpdateSchedule(ctx context.Context, id string, req UpdateScheduleRequest) (*models.EquipmentSchedule, error)
	DeleteSchedule(ctx context.Context, id string) error
}

type service struct {
	repo     Repository
	projRepo projects.Repository
	userRepo users.Repository
}

func NewService(repo Repository, projRepo projects.Repository, userRepo users.Repository) Service {
	return &service{repo: repo, projRepo: projRepo, userRepo: userRepo}
}

func parseDate(s string) (*time.Time, error) {
	if s == "" {
		return nil, nil
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (s *service) CreateEquipment(ctx context.Context, req CreateEquipmentRequest) (*models.Equipment, error) {
	purchaseDate, err := parseDate(req.PurchaseDate)
	if err != nil {
		return nil, errors.New("invalid purchase_date format, use YYYY-MM-DD")
	}
	eq := &models.Equipment{
		Name:         req.Name,
		Type:         req.Type,
		Manufacturer: req.Manufacturer,
		Model:        req.Model,
		SerialNumber: req.SerialNumber,
		PurchaseDate: purchaseDate,
		Status:       models.EquipmentStatusActive,
		Location:     req.Location,
		Notes:        req.Notes,
		ProjectID:    req.ProjectID,
	}
	if err := s.repo.CreateEquipment(ctx, eq); err != nil {
		return nil, err
	}
	return s.repo.GetEquipmentByID(ctx, eq.ID)
}

func (s *service) GetEquipmentByID(ctx context.Context, id string) (*models.Equipment, error) {
	eq, err := s.repo.GetEquipmentByID(ctx, id)
	if err != nil {
		return nil, ErrEquipmentNotFound
	}
	return eq, nil
}

func (s *service) ListEquipment(ctx context.Context, status, projectID string) ([]models.Equipment, error) {
	return s.repo.ListEquipment(ctx, status, projectID)
}

func (s *service) UpdateEquipment(ctx context.Context, id string, req UpdateEquipmentRequest) (*models.Equipment, error) {
	eq, err := s.repo.GetEquipmentByID(ctx, id)
	if err != nil {
		return nil, ErrEquipmentNotFound
	}
	if req.Name != nil {
		eq.Name = *req.Name
	}
	if req.Type != nil {
		eq.Type = *req.Type
	}
	if req.Manufacturer != nil {
		eq.Manufacturer = *req.Manufacturer
	}
	if req.Model != nil {
		eq.Model = *req.Model
	}
	if req.SerialNumber != nil {
		eq.SerialNumber = *req.SerialNumber
	}
	if req.PurchaseDate != nil {
		t, err := parseDate(*req.PurchaseDate)
		if err != nil {
			return nil, errors.New("invalid purchase_date format")
		}
		eq.PurchaseDate = t
	}
	if req.Status != nil {
		eq.Status = *req.Status
	}
	if req.Location != nil {
		eq.Location = *req.Location
	}
	if req.Notes != nil {
		eq.Notes = *req.Notes
	}
	if req.ProjectID != nil {
		eq.ProjectID = req.ProjectID
	}
	if err := s.repo.UpdateEquipment(ctx, eq); err != nil {
		return nil, err
	}
	return s.repo.GetEquipmentByID(ctx, id)
}

func (s *service) DeleteEquipment(ctx context.Context, id string) error {
	_, err := s.repo.GetEquipmentByID(ctx, id)
	if err != nil {
		return ErrEquipmentNotFound
	}
	return s.repo.DeleteEquipment(ctx, id)
}

func (s *service) CreateMaintenance(ctx context.Context, equipmentID string, req CreateMaintenanceRequest) (*models.MaintenanceTask, error) {
	if _, err := s.repo.GetEquipmentByID(ctx, equipmentID); err != nil {
		return nil, ErrEquipmentNotFound
	}
	scheduledAt, err := parseDate(req.ScheduledAt)
	if err != nil || scheduledAt == nil {
		return nil, errors.New("invalid scheduled_at format, use YYYY-MM-DD")
	}
	m := &models.MaintenanceTask{
		EquipmentID:     equipmentID,
		Type:           req.Type,
		ScheduledAt:    scheduledAt,
		AssignedTo:     req.AssignedTo,
		EstimatedHours: req.EstimatedHours,
		Status:         models.MaintenanceStatusScheduled,
	}
	if err := s.repo.CreateMaintenance(ctx, m); err != nil {
		return nil, err
	}
	return s.repo.GetMaintenanceByID(ctx, m.ID)
}

func (s *service) GetMaintenanceByID(ctx context.Context, id string) (*models.MaintenanceTask, error) {
	m, err := s.repo.GetMaintenanceByID(ctx, id)
	if err != nil {
		return nil, ErrMaintenanceNotFound
	}
	return m, nil
}

func (s *service) ListMaintenanceByEquipment(ctx context.Context, equipmentID string) ([]models.MaintenanceTask, error) {
	return s.repo.ListMaintenanceByEquipment(ctx, equipmentID)
}

func (s *service) UpdateMaintenance(ctx context.Context, id string, req UpdateMaintenanceRequest) (*models.MaintenanceTask, error) {
	m, err := s.repo.GetMaintenanceByID(ctx, id)
	if err != nil {
		return nil, ErrMaintenanceNotFound
	}
	if req.ScheduledAt != nil {
		t, err := parseDate(*req.ScheduledAt)
		if err != nil {
			return nil, errors.New("invalid scheduled_at format")
		}
		m.ScheduledAt = t
	}
	if req.Status != nil {
		m.Status = *req.Status
	}
	if err := s.repo.UpdateMaintenance(ctx, m); err != nil {
		return nil, err
	}
	// Sync equipment status so "Under Maintenance" stat updates: IN_PROGRESS -> equipment MAINTENANCE, COMPLETED/CANCELLED -> ACTIVE
	if req.Status != nil {
		eq, err := s.repo.GetEquipmentByID(ctx, m.EquipmentID)
		if err == nil && eq != nil {
			switch *req.Status {
			case models.MaintenanceStatusInProgress:
				eq.Status = models.EquipmentStatusMaintenance
				_ = s.repo.UpdateEquipment(ctx, eq)
			case models.MaintenanceStatusCompleted, models.MaintenanceStatusCancelled:
				eq.Status = models.EquipmentStatusActive
				_ = s.repo.UpdateEquipment(ctx, eq)
			}
		}
	}
	return s.repo.GetMaintenanceByID(ctx, id)
}

func (s *service) DeleteMaintenance(ctx context.Context, id string) error {
	if _, err := s.repo.GetMaintenanceByID(ctx, id); err != nil {
		return ErrMaintenanceNotFound
	}
	return s.repo.DeleteMaintenance(ctx, id)
}

func (s *service) GetDashboard(ctx context.Context) (*DashboardResponse, error) {
	total, _ := s.repo.CountAll(ctx)
	available, _ := s.repo.CountByStatus(ctx, models.EquipmentStatusActive)
	underMaint, _ := s.repo.CountByStatus(ctx, models.EquipmentStatusMaintenance)
	critical := int64(0) // could be maintenance overdue; for now 0 or derive from overdue tasks

	upcoming, err := s.repo.ListUpcomingMaintenance(ctx, 10)
	if err != nil {
		upcoming = nil
	}

	items := make([]UpcomingMaintenanceItem, 0, len(upcoming))
	for _, m := range upcoming {
		eq, _ := s.repo.GetEquipmentByID(ctx, m.EquipmentID)
		name := ""
		if eq != nil {
			name = eq.Name
		}
		dateStr := ""
		if m.ScheduledAt != nil {
			dateStr = m.ScheduledAt.Format("2006-01-02")
		}
		hoursStr := ""
		if m.EstimatedHours > 0 {
			hoursStr = formatHours(m.EstimatedHours)
		}
		assignedToName := ""
		if m.AssignedTo != "" {
			if u, err := s.userRepo.GetUserByID(ctx, m.AssignedTo); err == nil && u != nil {
				if u.Name != "" {
					assignedToName = u.Name
				} else {
					assignedToName = u.Email
				}
			}
		}
		items = append(items, UpcomingMaintenanceItem{
			ID:             m.ID,
			EquipmentName:  name,
			Type:           string(m.Type),
			AssignedTo:     m.AssignedTo,
			AssignedToName: assignedToName,
			Date:           dateStr,
			Hours:          hoursStr,
			Status:         string(m.Status),
		})
	}

	return &DashboardResponse{
		TotalEquipment:      total,
		Available:           available,
		UnderMaintenance:    underMaint,
		CriticalAlerts:      critical,
		UpcomingMaintenance: items,
	}, nil
}

func (s *service) ListScheduled(ctx context.Context) ([]ScheduledItemResponse, error) {
	list, err := s.repo.ListScheduled(ctx)
	if err != nil {
		return nil, err
	}
	out := make([]ScheduledItemResponse, 0, len(list))
	for _, sch := range list {
		projName := "N/A"
		if p, err := s.projRepo.GetByID(ctx, sch.ProjectID); err == nil {
			projName = p.Name
		}
		eqName := ""
		if eq, err := s.repo.GetEquipmentByID(ctx, sch.EquipmentID); err == nil {
			eqName = eq.Name
		}
		out = append(out, ScheduledItemResponse{
			ID:            sch.ID,
			ProjectID:     sch.ProjectID,
			ProjectName:   projName,
			EquipmentID:   sch.EquipmentID,
			EquipmentName: eqName,
			OperatorName:  sch.OperatorName,
			ScheduleDate:  sch.ScheduleDate.Format("01/02/2006"),
		})
	}
	return out, nil
}

func (s *service) CreateSchedule(ctx context.Context, req CreateScheduleRequest) (*models.EquipmentSchedule, error) {
	date, err := time.Parse("2006-01-02", req.ScheduleDate)
	if err != nil {
		return nil, errors.New("invalid schedule_date format, use YYYY-MM-DD")
	}
	if _, err := s.repo.GetEquipmentByID(ctx, req.EquipmentID); err != nil {
		return nil, ErrEquipmentNotFound
	}
	if _, err := s.projRepo.GetByID(ctx, req.ProjectID); err != nil {
		return nil, errors.New("project not found")
	}
	sch := &models.EquipmentSchedule{
		ProjectID:    req.ProjectID,
		EquipmentID:  req.EquipmentID,
		OperatorName: req.OperatorName,
		ScheduleDate: date,
	}
	if err := s.repo.CreateSchedule(ctx, sch); err != nil {
		return nil, err
	}
	return sch, nil
}

func (s *service) UpdateSchedule(ctx context.Context, id string, req UpdateScheduleRequest) (*models.EquipmentSchedule, error) {
	sch, err := s.repo.GetScheduleByID(ctx, id)
	if err != nil {
		return nil, ErrScheduleNotFound
	}
	if req.ProjectID != nil {
		if _, err := s.projRepo.GetByID(ctx, *req.ProjectID); err != nil {
			return nil, errors.New("project not found")
		}
		sch.ProjectID = *req.ProjectID
	}
	if req.EquipmentID != nil {
		if _, err := s.repo.GetEquipmentByID(ctx, *req.EquipmentID); err != nil {
			return nil, ErrEquipmentNotFound
		}
		sch.EquipmentID = *req.EquipmentID
	}
	if req.OperatorName != nil {
		sch.OperatorName = *req.OperatorName
	}
	if req.ScheduleDate != nil {
		date, err := time.Parse("2006-01-02", *req.ScheduleDate)
		if err != nil {
			return nil, errors.New("invalid schedule_date format, use YYYY-MM-DD")
		}
		sch.ScheduleDate = date
	}
	if err := s.repo.UpdateSchedule(ctx, sch); err != nil {
		return nil, err
	}
	return s.repo.GetScheduleByID(ctx, id)
}

func (s *service) DeleteSchedule(ctx context.Context, id string) error {
	if _, err := s.repo.GetScheduleByID(ctx, id); err != nil {
		return ErrScheduleNotFound
	}
	return s.repo.DeleteSchedule(ctx, id)
}

func formatHours(h float64) string {
	if h <= 0 {
		return ""
	}
	return fmt.Sprintf("%.1f hours", h)
}
