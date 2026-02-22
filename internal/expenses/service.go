package expenses

import (
	"context"
	"errors"
	"time"

	"erp-project/internal/models"
	projectsPkg "erp-project/internal/projects"
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
}

func NewService(repo Repository, projectRepo projectsPkg.Repository) Service {
	return &service{repo: repo, projectRepo: projectRepo}
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

	expense.Status = req.Status
	if req.Status == models.ExpenseStatusApproved {
		expense.ApprovedBy = &approvedBy
	}

	err = s.repo.Update(ctx, expense)
	if err != nil {
		return nil, err
	}

	// Update project spent_amount after approval
	if req.Status == models.ExpenseStatusApproved {
		totalSpent, err := s.repo.GetTotalSpentByProject(ctx, expense.ProjectID)
		if err == nil {
			project, err := s.projectRepo.GetByID(ctx, expense.ProjectID)
			if err == nil {
				project.SpentAmount = totalSpent
				_ = s.projectRepo.Update(ctx, project)
			}
		}
	}

	return s.repo.GetByID(ctx, expense.ID)
}

func (s *service) DeleteExpense(ctx context.Context, id string) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return ErrExpenseNotFound
	}
	return s.repo.Delete(ctx, id)
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
