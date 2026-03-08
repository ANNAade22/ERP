package expenses

import (
	"context"
	"errors"
	"log"
	"time"

	"erp-project/internal/models"
	projectsPkg "erp-project/internal/projects"

	"gorm.io/gorm"
)

var (
	ErrExpenseNotFound = errors.New("expense not found")
)

type CreateExpenseRequest struct {
	ProjectID   string                 `json:"project_id" binding:"required"`
	Category    models.ExpenseCategory `json:"category" binding:"required"`
	Amount      float64                `json:"amount" binding:"required,gt=0"`
	Description string                 `json:"description"`
	Date        string                 `json:"date" binding:"required"` // YYYY-MM-DD
}

type UpdateExpenseStatusRequest struct {
	Status models.ExpenseStatus `json:"status" binding:"required"`
}

type Service interface {
	CreateExpense(ctx context.Context, req CreateExpenseRequest, createdBy string) (*models.Expense, error)
	GetExpenseByID(ctx context.Context, id string) (*models.Expense, error)
	GetExpensesByProject(ctx context.Context, projectID string) ([]models.Expense, error)
	GetExpensesByDateRange(ctx context.Context, projectID, from, to string) ([]models.Expense, error)
	UpdateExpenseStatus(ctx context.Context, id string, req UpdateExpenseStatusRequest, approvedBy string) (*models.Expense, error)
	DeleteExpense(ctx context.Context, id string) error
	GetProjectExpenseSummary(ctx context.Context, projectID string) (*ProjectExpenseSummary, error)
	GetCategoryBreakdown(ctx context.Context, projectID string) ([]CategoryBreakdown, error)
}

type service struct {
	repo       Repository
	projectRepo projectsPkg.Repository
	db         *gorm.DB
}

func NewService(repo Repository, projectRepo projectsPkg.Repository, db *gorm.DB) Service {
	return &service{repo: repo, projectRepo: projectRepo, db: db}
}

func (s *service) CreateExpense(ctx context.Context, req CreateExpenseRequest, createdBy string) (*models.Expense, error) {
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return nil, errors.New("invalid date format, use YYYY-MM-DD")
	}

	expense := &models.Expense{
		ProjectID:   req.ProjectID,
		Category:    req.Category,
		Amount:      req.Amount,
		Description: req.Description,
		Date:        date,
		Status:      models.ExpenseStatusPending,
		CreatedBy:   createdBy,
	}

	err = s.repo.Create(ctx, expense)
	if err != nil {
		return nil, err
	}

	return s.repo.GetByID(ctx, expense.ID)
}

func (s *service) GetExpenseByID(ctx context.Context, id string) (*models.Expense, error) {
	expense, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrExpenseNotFound
	}
	return expense, nil
}

func (s *service) GetExpensesByProject(ctx context.Context, projectID string) ([]models.Expense, error) {
	return s.repo.GetByProject(ctx, projectID)
}

func (s *service) GetExpensesByDateRange(ctx context.Context, projectID, from, to string) ([]models.Expense, error) {
	f, err := time.Parse("2006-01-02", from)
	if err != nil {
		return nil, errors.New("invalid from date format")
	}
	t, err := time.Parse("2006-01-02", to)
	if err != nil {
		return nil, errors.New("invalid to date format")
	}
	return s.repo.GetByProjectAndDateRange(ctx, projectID, f, t)
}

func (s *service) UpdateExpenseStatus(ctx context.Context, id string, req UpdateExpenseStatusRequest, approvedBy string) (*models.Expense, error) {
	expense, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrExpenseNotFound
	}

	projectID := expense.ProjectID

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		expense.Status = req.Status
		if req.Status == models.ExpenseStatusApproved {
			expense.ApprovedBy = &approvedBy
		}
		if err := tx.Save(expense).Error; err != nil {
			return err
		}
		// Recalc project spent_amount on any status change (approve or reject)
		var totalSpent float64
		if err := tx.Model(&models.Expense{}).
			Where("project_id = ? AND status = ?", projectID, models.ExpenseStatusApproved).
			Select("COALESCE(SUM(amount), 0)").
			Scan(&totalSpent).Error; err != nil {
			return err
		}
		return tx.Model(&models.Project{}).Where("id = ?", projectID).Update("spent_amount", totalSpent).Error
	})
	if err != nil {
		return nil, err
	}

	log.Printf("[expense] status_updated expense_id=%s project_id=%s new_status=%s by=%s", id, projectID, req.Status, approvedBy)
	return s.repo.GetByID(ctx, id)
}

func (s *service) DeleteExpense(ctx context.Context, id string) error {
	expense, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return ErrExpenseNotFound
	}
	projectID := expense.ProjectID

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("id = ?", id).Delete(&models.Expense{}).Error; err != nil {
			return err
		}
		var totalSpent float64
		if err := tx.Model(&models.Expense{}).
			Where("project_id = ? AND status = ?", projectID, models.ExpenseStatusApproved).
			Select("COALESCE(SUM(amount), 0)").
			Scan(&totalSpent).Error; err != nil {
			return err
		}
		return tx.Model(&models.Project{}).Where("id = ?", projectID).Update("spent_amount", totalSpent).Error
	})
	if err != nil {
		return err
	}

	log.Printf("[expense] deleted expense_id=%s project_id=%s", id, projectID)
	return nil
}

func (s *service) GetProjectExpenseSummary(ctx context.Context, projectID string) (*ProjectExpenseSummary, error) {
	project, err := s.projectRepo.GetByID(ctx, projectID)
	if err != nil {
		return nil, errors.New("project not found")
	}

	totalSpent, err := s.repo.GetTotalSpentByProject(ctx, projectID)
	if err != nil {
		return nil, err
	}

	remaining := project.Budget - totalSpent
	percentUsed := float64(0)
	if project.Budget > 0 {
		percentUsed = (totalSpent / project.Budget) * 100
	}

	return &ProjectExpenseSummary{
		ProjectID:   projectID,
		TotalSpent:  totalSpent,
		Budget:      project.Budget,
		Remaining:   remaining,
		PercentUsed: percentUsed,
	}, nil
}

func (s *service) GetCategoryBreakdown(ctx context.Context, projectID string) ([]CategoryBreakdown, error) {
	return s.repo.GetCategoryBreakdown(ctx, projectID)
}
