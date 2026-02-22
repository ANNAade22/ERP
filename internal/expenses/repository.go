package expenses

import (
	"context"
	"time"

	"erp-project/internal/models"

	"gorm.io/gorm"
)

// ProjectExpenseSummary holds the aggregated expense data per project
type ProjectExpenseSummary struct {
	ProjectID    string  `json:"project_id"`
	TotalSpent   float64 `json:"total_spent"`
	Budget       float64 `json:"budget"`
	Remaining    float64 `json:"remaining"`
	PercentUsed  float64 `json:"percent_used"`
}

// CategoryBreakdown holds spending per category
type CategoryBreakdown struct {
	Category models.ExpenseCategory `json:"category"`
	Total    float64                `json:"total"`
}

type Repository interface {
	Create(ctx context.Context, expense *models.Expense) error
	GetByID(ctx context.Context, id string) (*models.Expense, error)
	GetByProject(ctx context.Context, projectID string) ([]models.Expense, error)
	GetByProjectAndDateRange(ctx context.Context, projectID string, from, to time.Time) ([]models.Expense, error)
	Update(ctx context.Context, expense *models.Expense) error
	Delete(ctx context.Context, id string) error

	// Aggregation queries
	GetTotalSpentByProject(ctx context.Context, projectID string) (float64, error)
	GetCategoryBreakdown(ctx context.Context, projectID string) ([]CategoryBreakdown, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(ctx context.Context, expense *models.Expense) error {
	return r.db.WithContext(ctx).Create(expense).Error
}

func (r *repository) GetByID(ctx context.Context, id string) (*models.Expense, error) {
	var expense models.Expense
	err := r.db.WithContext(ctx).Preload("Project").Preload("Creator").Where("id = ?", id).First(&expense).Error
	if err != nil {
		return nil, err
	}
	return &expense, nil
}

func (r *repository) GetByProject(ctx context.Context, projectID string) ([]models.Expense, error) {
	var expenses []models.Expense
	err := r.db.WithContext(ctx).
		Preload("Creator").
		Where("project_id = ?", projectID).
		Order("date DESC").
		Find(&expenses).Error
	return expenses, err
}

func (r *repository) GetByProjectAndDateRange(ctx context.Context, projectID string, from, to time.Time) ([]models.Expense, error) {
	var expenses []models.Expense
	err := r.db.WithContext(ctx).
		Preload("Creator").
		Where("project_id = ? AND date BETWEEN ? AND ?", projectID, from, to).
		Order("date DESC").
		Find(&expenses).Error
	return expenses, err
}

func (r *repository) Update(ctx context.Context, expense *models.Expense) error {
	return r.db.WithContext(ctx).Save(expense).Error
}

func (r *repository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.Expense{}).Error
}

// --- Aggregation queries ---

func (r *repository) GetTotalSpentByProject(ctx context.Context, projectID string) (float64, error) {
	var total float64
	err := r.db.WithContext(ctx).
		Model(&models.Expense{}).
		Where("project_id = ? AND status = ?", projectID, models.ExpenseStatusApproved).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&total).Error
	return total, err
}

func (r *repository) GetCategoryBreakdown(ctx context.Context, projectID string) ([]CategoryBreakdown, error) {
	var breakdown []CategoryBreakdown
	err := r.db.WithContext(ctx).
		Model(&models.Expense{}).
		Where("project_id = ? AND status = ?", projectID, models.ExpenseStatusApproved).
		Select("category, COALESCE(SUM(amount), 0) as total").
		Group("category").
		Scan(&breakdown).Error
	return breakdown, err
}
