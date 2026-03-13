package dashboard

import (
	"context"
	"time"

	"erp-project/internal/models"

	"gorm.io/gorm"
)

// --- Response DTOs ---

type OverviewStats struct {
	TotalProjects     int64   `json:"total_projects"`
	ActiveProjects    int64   `json:"active_projects"`
	TotalBudget       float64 `json:"total_budget"`
	TotalSpent        float64 `json:"total_spent"`
	BudgetRemaining   float64 `json:"budget_remaining"`
	BudgetUtilization float64 `json:"budget_utilization"` // percentage
}

type ProjectSummary struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Status      string  `json:"status"`
	Budget      float64 `json:"budget"`
	SpentAmount float64 `json:"spent_amount"`
	Remaining   float64 `json:"remaining"`
	PercentUsed float64 `json:"percent_used"`
}

type AttendanceSummary struct {
	ProjectID    string  `json:"project_id"`
	ProjectName  string  `json:"project_name"`
	TotalWorkers int64   `json:"total_workers"`
	PresentToday int64   `json:"present_today"`
	AbsentToday  int64   `json:"absent_today"`
	AttendanceRate float64 `json:"attendance_rate"` // percentage
}

type ExpenseCategorySummary struct {
	Category string  `json:"category"`
	Total    float64 `json:"total"`
}

type MaterialAlert struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Unit         string  `json:"unit"`
	CurrentStock float64 `json:"current_stock"`
	MinStock     float64 `json:"min_stock"`
	ProjectName  string  `json:"project_name"`
}

type ProcurementSummary struct {
	PendingRequests  int64   `json:"pending_requests"`
	ApprovedRequests int64   `json:"approved_requests"`
	TotalPurchaseValue float64 `json:"total_purchase_value"`
}

type EquipmentSummary struct {
	TotalEquipment   int64 `json:"total_equipment"`
	Available        int64 `json:"available"`
	UnderMaintenance int64 `json:"under_maintenance"`
}

type VendorSummary struct {
	Total     int64 `json:"total"`
	Active    int64 `json:"active"`
	Preferred int64 `json:"preferred"`
}

type DashboardResponse struct {
	Overview            OverviewStats            `json:"overview"`
	ProjectSummaries    []ProjectSummary         `json:"project_summaries"`
	AttendanceSummaries []AttendanceSummary     `json:"attendance_summaries"`
	ExpenseBreakdown    []ExpenseCategorySummary `json:"expense_breakdown"`
	LowStockAlerts      []MaterialAlert          `json:"low_stock_alerts"`
	Procurement         ProcurementSummary      `json:"procurement"`
	Equipment           EquipmentSummary        `json:"equipment"`
	Vendors             VendorSummary            `json:"vendors"`
}

// --- Service ---

type Service interface {
	GetDashboard(ctx context.Context) (*DashboardResponse, error)
	GetProjectDashboard(ctx context.Context, projectID string) (*DashboardResponse, error)
}

type service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) Service {
	return &service{db: db}
}

func (s *service) GetDashboard(ctx context.Context) (*DashboardResponse, error) {
	dashboard := &DashboardResponse{}

	// 1. Overview Stats
	overview, err := s.getOverviewStats(ctx, "")
	if err != nil {
		return nil, err
	}
	dashboard.Overview = *overview

	// 2. Project Summaries
	projects, err := s.getProjectSummaries(ctx, "")
	if err != nil {
		return nil, err
	}
	dashboard.ProjectSummaries = projects

	// 3. Attendance Summaries (today)
	attendance, err := s.getAttendanceSummaries(ctx)
	if err != nil {
		return nil, err
	}
	dashboard.AttendanceSummaries = attendance

	// 4. Expense Breakdown (all projects)
	expenses, err := s.getExpenseBreakdown(ctx, "")
	if err != nil {
		return nil, err
	}
	dashboard.ExpenseBreakdown = expenses

	// 5. Low Stock Alerts
	alerts, err := s.getLowStockAlerts(ctx, "")
	if err != nil {
		return nil, err
	}
	dashboard.LowStockAlerts = alerts

	// 6. Procurement Summary
	procurement, err := s.getProcurementSummary(ctx)
	if err != nil {
		return nil, err
	}
	dashboard.Procurement = *procurement

	// 7. Equipment Summary
	equipment, err := s.getEquipmentSummary(ctx)
	if err != nil {
		return nil, err
	}
	dashboard.Equipment = *equipment

	// 8. Vendor Summary
	vendors, err := s.getVendorSummary(ctx)
	if err != nil {
		return nil, err
	}
	dashboard.Vendors = *vendors

	return dashboard, nil
}

func (s *service) GetProjectDashboard(ctx context.Context, projectID string) (*DashboardResponse, error) {
	dashboard := &DashboardResponse{}

	overview, err := s.getOverviewStats(ctx, projectID)
	if err != nil {
		return nil, err
	}
	dashboard.Overview = *overview

	projects, err := s.getProjectSummaries(ctx, projectID)
	if err != nil {
		return nil, err
	}
	dashboard.ProjectSummaries = projects

	expenses, err := s.getExpenseBreakdown(ctx, projectID)
	if err != nil {
		return nil, err
	}
	dashboard.ExpenseBreakdown = expenses

	alerts, err := s.getLowStockAlerts(ctx, projectID)
	if err != nil {
		return nil, err
	}
	dashboard.LowStockAlerts = alerts

	equipment, err := s.getEquipmentSummary(ctx)
	if err != nil {
		return nil, err
	}
	dashboard.Equipment = *equipment

	vendors, err := s.getVendorSummary(ctx)
	if err != nil {
		return nil, err
	}
	dashboard.Vendors = *vendors

	return dashboard, nil
}

// --- Private aggregation methods ---

func (s *service) getOverviewStats(ctx context.Context, projectID string) (*OverviewStats, error) {
	stats := &OverviewStats{}

	projectQuery := s.db.WithContext(ctx).Model(&models.Project{})
	if projectID != "" {
		projectQuery = projectQuery.Where("id = ?", projectID)
	}

	projectQuery.Count(&stats.TotalProjects)

	activeQuery := s.db.WithContext(ctx).Model(&models.Project{}).Where("status = ?", models.ProjectStatusInProgress)
	if projectID != "" {
		activeQuery = activeQuery.Where("id = ?", projectID)
	}
	activeQuery.Count(&stats.ActiveProjects)

	budgetQuery := s.db.WithContext(ctx).Model(&models.Project{})
	if projectID != "" {
		budgetQuery = budgetQuery.Where("id = ?", projectID)
	}
	budgetQuery.Select("COALESCE(SUM(budget), 0)").Scan(&stats.TotalBudget)
	budgetQuery.Select("COALESCE(SUM(spent_amount), 0)").Scan(&stats.TotalSpent)

	stats.BudgetRemaining = stats.TotalBudget - stats.TotalSpent
	if stats.TotalBudget > 0 {
		stats.BudgetUtilization = (stats.TotalSpent / stats.TotalBudget) * 100
	}

	return stats, nil
}

func (s *service) getProjectSummaries(ctx context.Context, projectID string) ([]ProjectSummary, error) {
	var projects []models.Project

	query := s.db.WithContext(ctx)
	if projectID != "" {
		query = query.Where("id = ?", projectID)
	}
	err := query.Order("created_at DESC").Find(&projects).Error
	if err != nil {
		return nil, err
	}

	summaries := make([]ProjectSummary, len(projects))
	for i, p := range projects {
		remaining := p.Budget - p.SpentAmount
		percentUsed := float64(0)
		if p.Budget > 0 {
			percentUsed = (p.SpentAmount / p.Budget) * 100
		}
		summaries[i] = ProjectSummary{
			ID:          p.ID,
			Name:        p.Name,
			Status:      string(p.Status),
			Budget:      p.Budget,
			SpentAmount: p.SpentAmount,
			Remaining:   remaining,
			PercentUsed: percentUsed,
		}
	}

	return summaries, nil
}

func (s *service) getAttendanceSummaries(ctx context.Context) ([]AttendanceSummary, error) {
	today := time.Now().Format("2006-01-02")

	var projects []models.Project
	err := s.db.WithContext(ctx).Where("status = ?", models.ProjectStatusInProgress).Find(&projects).Error
	if err != nil {
		return nil, err
	}

	summaries := make([]AttendanceSummary, 0)
	for _, p := range projects {
		var totalWorkers int64
		s.db.WithContext(ctx).Model(&models.Worker{}).
			Where("project_id = ? AND is_active = ?", p.ID, true).
			Count(&totalWorkers)

		var presentToday int64
		s.db.WithContext(ctx).Model(&models.Attendance{}).
			Where("project_id = ? AND date = ? AND status = ?", p.ID, today, models.AttendanceStatusPresent).
			Count(&presentToday)

		rate := float64(0)
		if totalWorkers > 0 {
			rate = (float64(presentToday) / float64(totalWorkers)) * 100
		}

		summaries = append(summaries, AttendanceSummary{
			ProjectID:     p.ID,
			ProjectName:   p.Name,
			TotalWorkers:  totalWorkers,
			PresentToday:  presentToday,
			AbsentToday:   totalWorkers - presentToday,
			AttendanceRate: rate,
		})
	}

	return summaries, nil
}

func (s *service) getExpenseBreakdown(ctx context.Context, projectID string) ([]ExpenseCategorySummary, error) {
	var breakdown []ExpenseCategorySummary

	query := s.db.WithContext(ctx).
		Model(&models.Expense{}).
		Where("status = ?", models.ExpenseStatusApproved)

	if projectID != "" {
		query = query.Where("project_id = ?", projectID)
	}

	err := query.
		Select("category, COALESCE(SUM(amount), 0) as total").
		Group("category").
		Order("total DESC").
		Scan(&breakdown).Error

	return breakdown, err
}

func (s *service) getLowStockAlerts(ctx context.Context, projectID string) ([]MaterialAlert, error) {
	var alerts []MaterialAlert

	query := s.db.WithContext(ctx).
		Model(&models.Material{}).
		Joins("JOIN projects ON projects.id = materials.project_id").
		Where("materials.current_stock <= materials.min_stock AND materials.min_stock > 0")

	if projectID != "" {
		query = query.Where("materials.project_id = ?", projectID)
	}

	err := query.
		Select("materials.id, materials.name, materials.unit, materials.current_stock, materials.min_stock, projects.name as project_name").
		Scan(&alerts).Error

	return alerts, err
}

func (s *service) getProcurementSummary(ctx context.Context) (*ProcurementSummary, error) {
	summary := &ProcurementSummary{}

	s.db.WithContext(ctx).Model(&models.PurchaseRequest{}).
		Where("status = ?", models.PurchaseRequestPending).
		Count(&summary.PendingRequests)

	s.db.WithContext(ctx).Model(&models.PurchaseRequest{}).
		Where("status = ?", models.PurchaseRequestApproved).
		Count(&summary.ApprovedRequests)

	s.db.WithContext(ctx).Model(&models.PurchaseRequest{}).
		Where("status IN ?", []string{string(models.PurchaseRequestApproved), string(models.PurchaseRequestOrdered), string(models.PurchaseRequestReceived)}).
		Select("COALESCE(SUM(total_price), 0)").
		Scan(&summary.TotalPurchaseValue)

	return summary, nil
}

func (s *service) getVendorSummary(ctx context.Context) (*VendorSummary, error) {
	summary := &VendorSummary{}
	s.db.WithContext(ctx).Model(&models.Vendor{}).Count(&summary.Total)
	s.db.WithContext(ctx).Model(&models.Vendor{}).Where("status = ?", models.VendorStatusActive).Count(&summary.Active)
	s.db.WithContext(ctx).Model(&models.Vendor{}).Where("status = ?", models.VendorStatusPreferred).Count(&summary.Preferred)
	return summary, nil
}

func (s *service) getEquipmentSummary(ctx context.Context) (*EquipmentSummary, error) {
	summary := &EquipmentSummary{}

	s.db.WithContext(ctx).Model(&models.Equipment{}).Count(&summary.TotalEquipment)
	s.db.WithContext(ctx).Model(&models.Equipment{}).Where("status = ?", models.EquipmentStatusActive).Count(&summary.Available)
	s.db.WithContext(ctx).Model(&models.Equipment{}).Where("status = ?", models.EquipmentStatusMaintenance).Count(&summary.UnderMaintenance)

	return summary, nil
}
