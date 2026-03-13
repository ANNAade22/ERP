package finance

import (
	"context"
	"math"
	"time"

	"erp-project/internal/models"

	"gorm.io/gorm"
)

// --- DTOs ---

type OverviewStats struct {
	TotalBudget       float64 `json:"total_budget"`
	TotalSpent        float64 `json:"total_spent"`
	BudgetRemaining   float64 `json:"budget_remaining"`
	BudgetUtilization float64 `json:"budget_utilization"`
}

type ProjectSummary struct {
	ID               string  `json:"id"`
	Name             string  `json:"name"`
	Status           string  `json:"status"`
	Budget           float64 `json:"budget"`
	SpentAmount      float64 `json:"spent_amount"`
	Remaining        float64 `json:"remaining"`
	PercentUsed      float64 `json:"percent_used"`
	CompletionPercent float64 `json:"completion_percent"`
}

type ExpenseCategorySummary struct {
	Category string  `json:"category"`
	Total    float64 `json:"total"`
}

type MonthTotal struct {
	Month string  `json:"month"`
	Total float64 `json:"total"`
}

type BudgetOverviewResponse struct {
	Overview         OverviewStats           `json:"overview"`
	ProjectSummaries []ProjectSummary        `json:"project_summaries"`
	ExpenseBreakdown []ExpenseCategorySummary `json:"expense_breakdown"`
}

type ProjectProfitability struct {
	ID             string  `json:"id"`
	Name           string  `json:"name"`
	Status         string  `json:"status"`
	Revenue        float64 `json:"revenue"`
	Costs          float64 `json:"costs"`
	Profit         float64 `json:"profit"`
	ProfitMargin   float64 `json:"profit_margin"`
	CostEfficiency float64 `json:"cost_efficiency"`
	Completion     float64 `json:"completion"`
}

type ProfitabilityResponse struct {
	TotalRevenue   float64                 `json:"total_revenue"`
	TotalCosts     float64                 `json:"total_costs"`
	NetProfit      float64                 `json:"net_profit"`
	ProfitMargin   float64                 `json:"profit_margin"`
	Projects       []ProjectProfitability  `json:"projects"`
}

type ExpensesByMonthResponse struct {
	Months []MonthTotal `json:"months"`
}

type CashFlowMonth struct {
	Month    string  `json:"month"`
	Inflows  float64 `json:"inflows"`
	Outflows float64 `json:"outflows"`
	Net      float64 `json:"net"`
}

type ProfitabilityTrendMonth struct {
	Month        string  `json:"month"`
	Revenue      float64 `json:"revenue"`
	Costs        float64 `json:"costs"`
	Profit       float64 `json:"profit"`
	ProfitMargin float64 `json:"profit_margin"`
}

// --- Service ---

type OverrunProject struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Status      string  `json:"status"`
	Budget      float64 `json:"budget"`
	SpentAmount float64 `json:"spent_amount"`
	Overrun     float64 `json:"overrun"`
	OverrunPct  float64 `json:"overrun_pct"`
}

type Service interface {
	GetBudgetOverview(ctx context.Context) (*BudgetOverviewResponse, error)
	GetProfitability(ctx context.Context) (*ProfitabilityResponse, error)
	GetExpensesByMonth(ctx context.Context) ([]MonthTotal, error)
	GetOverrunAlerts(ctx context.Context) ([]OverrunProject, error)
	GetCashFlow(ctx context.Context) ([]CashFlowMonth, error)
	GetProfitabilityTrend(ctx context.Context) ([]ProfitabilityTrendMonth, error)
}

type service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) Service {
	return &service{db: db}
}

func roundMoney(v float64) float64 {
	return math.Round(v*100) / 100
}

func (s *service) GetBudgetOverview(ctx context.Context) (*BudgetOverviewResponse, error) {
	res := &BudgetOverviewResponse{}

	// Overview stats
	overview, err := s.getOverviewStats(ctx)
	if err != nil {
		return nil, err
	}
	res.Overview = *overview

	// Project summaries with completion
	projects, err := s.getProjectSummariesWithCompletion(ctx)
	if err != nil {
		return nil, err
	}
	res.ProjectSummaries = projects

	// Expense breakdown (all projects)
	breakdown, err := s.getExpenseBreakdown(ctx, "")
	if err != nil {
		return nil, err
	}
	res.ExpenseBreakdown = breakdown

	return res, nil
}

func (s *service) GetProfitability(ctx context.Context) (*ProfitabilityResponse, error) {
	projects, err := s.getProjectSummariesWithCompletion(ctx)
	if err != nil {
		return nil, err
	}

	res := &ProfitabilityResponse{}
	var totalRevenue, totalCosts float64

	projectProfs := make([]ProjectProfitability, 0, len(projects))
	for _, p := range projects {
		totalRevenue += p.Budget
		totalCosts += p.SpentAmount
		profit := p.Budget - p.SpentAmount
		margin := float64(0)
		if p.Budget > 0 {
			margin = (profit / p.Budget) * 100
		}
		costEff := float64(0)
		if p.Budget > 0 {
			costEff = ((p.Budget - p.SpentAmount) / p.Budget) * 100
		}
		projectProfs = append(projectProfs, ProjectProfitability{
			ID:             p.ID,
			Name:           p.Name,
			Status:         p.Status,
			Revenue:        roundMoney(p.Budget),
			Costs:          roundMoney(p.SpentAmount),
			Profit:         roundMoney(profit),
			ProfitMargin:   roundMoney(margin),
			CostEfficiency: roundMoney(costEff),
			Completion:     roundMoney(p.CompletionPercent),
		})
	}

	res.TotalRevenue = roundMoney(totalRevenue)
	res.TotalCosts = roundMoney(totalCosts)
	res.NetProfit = roundMoney(totalRevenue - totalCosts)
	if totalRevenue > 0 {
		res.ProfitMargin = roundMoney((res.NetProfit / totalRevenue) * 100)
	}
	res.Projects = projectProfs

	return res, nil
}

func (s *service) GetExpensesByMonth(ctx context.Context) ([]MonthTotal, error) {
	var results []struct {
		Month string  `gorm:"column:month"`
		Total float64 `gorm:"column:total"`
	}
	err := s.db.WithContext(ctx).
		Model(&models.Expense{}).
		Where("status = ?", models.ExpenseStatusApproved).
		Select("to_char(date, 'YYYY-MM') as month, COALESCE(SUM(amount), 0) as total").
		Group("to_char(date, 'YYYY-MM')").
		Order("month DESC").
		Limit(12).
		Scan(&results).Error
	if err != nil {
		return nil, err
	}

	out := make([]MonthTotal, len(results))
	for i, r := range results {
		out[i] = MonthTotal{Month: r.Month, Total: roundMoney(r.Total)}
	}
	return out, nil
}

func (s *service) getOverviewStats(ctx context.Context) (*OverviewStats, error) {
	stats := &OverviewStats{}
	err := s.db.WithContext(ctx).Model(&models.Project{}).
		Select("COALESCE(SUM(budget), 0)").Scan(&stats.TotalBudget).Error
	if err != nil {
		return nil, err
	}
	err = s.db.WithContext(ctx).Model(&models.Project{}).
		Select("COALESCE(SUM(spent_amount), 0)").Scan(&stats.TotalSpent).Error
	if err != nil {
		return nil, err
	}
	stats.TotalBudget = roundMoney(stats.TotalBudget)
	stats.TotalSpent = roundMoney(stats.TotalSpent)
	stats.BudgetRemaining = roundMoney(stats.TotalBudget - stats.TotalSpent)
	if stats.TotalBudget > 0 {
		stats.BudgetUtilization = roundMoney((stats.TotalSpent / stats.TotalBudget) * 100)
	}
	return stats, nil
}

func (s *service) getProjectSummariesWithCompletion(ctx context.Context) ([]ProjectSummary, error) {
	var projects []models.Project
	err := s.db.WithContext(ctx).Order("created_at DESC").Find(&projects).Error
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
		completion := s.getMilestoneCompletion(ctx, p.ID)
		summaries[i] = ProjectSummary{
			ID:                p.ID,
			Name:              p.Name,
			Status:            string(p.Status),
			Budget:            roundMoney(p.Budget),
			SpentAmount:       roundMoney(p.SpentAmount),
			Remaining:         roundMoney(remaining),
			PercentUsed:       roundMoney(percentUsed),
			CompletionPercent: roundMoney(completion),
		}
	}
	return summaries, nil
}

func (s *service) getMilestoneCompletion(ctx context.Context, projectID string) float64 {
	var avg float64
	err := s.db.WithContext(ctx).
		Model(&models.Milestone{}).
		Where("project_id = ?", projectID).
		Select("COALESCE(AVG(progress), 0)").
		Scan(&avg).Error
	if err != nil {
		return 0
	}
	return avg
}

func (s *service) GetOverrunAlerts(ctx context.Context) ([]OverrunProject, error) {
	summaries, err := s.getProjectSummariesWithCompletion(ctx)
	if err != nil {
		return nil, err
	}
	var out []OverrunProject
	for _, p := range summaries {
		if p.Budget > 0 && p.SpentAmount > p.Budget {
			overrun := p.SpentAmount - p.Budget
			overrunPct := (overrun / p.Budget) * 100
			out = append(out, OverrunProject{
				ID:          p.ID,
				Name:        p.Name,
				Status:      p.Status,
				Budget:      roundMoney(p.Budget),
				SpentAmount: roundMoney(p.SpentAmount),
				Overrun:     roundMoney(overrun),
				OverrunPct:  roundMoney(overrunPct),
			})
		}
	}
	// Sort by overrun amount descending (largest first)
	for i := 0; i < len(out); i++ {
		for j := i + 1; j < len(out); j++ {
			if out[j].Overrun > out[i].Overrun {
				out[i], out[j] = out[j], out[i]
			}
		}
	}
	return out, nil
}

func (s *service) GetCashFlow(ctx context.Context) ([]CashFlowMonth, error) {
	// Get total budget for inflow allocation (simple: budget/12 per month)
	var totalBudget float64
	_ = s.db.WithContext(ctx).Model(&models.Project{}).Select("COALESCE(SUM(budget), 0)").Scan(&totalBudget).Error
	totalBudget = roundMoney(totalBudget)
	monthlyInflow := totalBudget / 12

	// Get approved expenses by month
	var expenseResults []struct {
		Month string  `gorm:"column:month"`
		Total float64 `gorm:"column:total"`
	}
	_ = s.db.WithContext(ctx).
		Model(&models.Expense{}).
		Where("status = ?", models.ExpenseStatusApproved).
		Select("to_char(date, 'YYYY-MM') as month, COALESCE(SUM(amount), 0) as total").
		Group("to_char(date, 'YYYY-MM')").
		Order("month DESC").
		Limit(12).
		Scan(&expenseResults).Error

	expenseByMonth := make(map[string]float64)
	for _, r := range expenseResults {
		expenseByMonth[r.Month] = roundMoney(r.Total)
	}

	// Build last 12 months (newest first)
	now := time.Now()
	out := make([]CashFlowMonth, 0, 12)
	for i := 0; i < 12; i++ {
		m := now.AddDate(0, -i, 0)
		monthStr := m.Format("2006-01")
		outflows := expenseByMonth[monthStr]
		net := roundMoney(monthlyInflow - outflows)
		out = append(out, CashFlowMonth{
			Month:    monthStr,
			Inflows:  roundMoney(monthlyInflow),
			Outflows: roundMoney(outflows),
			Net:      net,
		})
	}
	return out, nil
}

func (s *service) GetProfitabilityTrend(ctx context.Context) ([]ProfitabilityTrendMonth, error) {
	var totalBudget float64
	_ = s.db.WithContext(ctx).Model(&models.Project{}).Select("COALESCE(SUM(budget), 0)").Scan(&totalBudget).Error
	totalBudget = roundMoney(totalBudget)
	monthlyRevenue := totalBudget / 12

	var expenseResults []struct {
		Month string  `gorm:"column:month"`
		Total float64 `gorm:"column:total"`
	}
	_ = s.db.WithContext(ctx).
		Model(&models.Expense{}).
		Where("status = ?", models.ExpenseStatusApproved).
		Select("to_char(date, 'YYYY-MM') as month, COALESCE(SUM(amount), 0) as total").
		Group("to_char(date, 'YYYY-MM')").
		Order("month DESC").
		Limit(12).
		Scan(&expenseResults).Error

	costsByMonth := make(map[string]float64)
	for _, r := range expenseResults {
		costsByMonth[r.Month] = roundMoney(r.Total)
	}

	now := time.Now()
	out := make([]ProfitabilityTrendMonth, 0, 12)
	for i := 0; i < 12; i++ {
		m := now.AddDate(0, -i, 0)
		monthStr := m.Format("2006-01")
		costs := costsByMonth[monthStr]
		rev := roundMoney(monthlyRevenue)
		profit := roundMoney(rev - costs)
		margin := float64(0)
		if rev > 0 {
			margin = roundMoney((profit / rev) * 100)
		}
		out = append(out, ProfitabilityTrendMonth{
			Month:        monthStr,
			Revenue:      rev,
			Costs:        roundMoney(costs),
			Profit:       profit,
			ProfitMargin: margin,
		})
	}
	return out, nil
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
		Select("category as category, COALESCE(SUM(amount), 0) as total").
		Group("category").
		Order("total DESC").
		Scan(&breakdown).Error
	if err != nil {
		return nil, err
	}
	for i := range breakdown {
		breakdown[i].Total = roundMoney(breakdown[i].Total)
	}
	return breakdown, nil
}
