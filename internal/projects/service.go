package projects

import (
	"context"
	"errors"
	"time"

	"erp-project/internal/models"
)

var (
	ErrProjectNotFound = errors.New("project not found")
)

type CreateProjectRequest struct {
	Name        string               `json:"name" binding:"required"`
	Description string               `json:"description"`
	Location    string               `json:"location"`
	Status      models.ProjectStatus `json:"status"`
	Budget      float64              `json:"budget" binding:"gte=0"`
	StartDate   string               `json:"start_date"` // format: YYYY-MM-DD
	EndDate     string               `json:"end_date"`   // format: YYYY-MM-DD
	Category    string               `json:"category"`
	Timeline    string               `json:"timeline"`
	TeamSize    int                  `json:"team_size"`
	Engineer    string               `json:"engineer"`
	ManagerID   string               `json:"manager_id"`
}

type UpdateProjectRequest struct {
	Name        *string               `json:"name"`
	Description *string               `json:"description"`
	Location    *string               `json:"location"`
	Status      *models.ProjectStatus `json:"status"`
	Budget      *float64              `json:"budget"`
	StartDate   *string               `json:"start_date"`
	EndDate     *string               `json:"end_date"`
	Category    *string               `json:"category"`
	Timeline    *string               `json:"timeline"`
	TeamSize    *int                  `json:"team_size"`
	Engineer    *string               `json:"engineer"`
	ManagerID   *string               `json:"manager_id"`
}

type Service interface {
	CreateProject(ctx context.Context, req CreateProjectRequest, createdBy string) (*models.Project, error)
	GetProjectByID(ctx context.Context, id string) (*models.Project, error)
	GetAllProjects(ctx context.Context) ([]models.Project, error)
	GetProjectsByManager(ctx context.Context, managerID string) ([]models.Project, error)
	UpdateProject(ctx context.Context, id string, req UpdateProjectRequest) (*models.Project, error)
	DeleteProject(ctx context.Context, id string) error
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

func (s *service) CreateProject(ctx context.Context, req CreateProjectRequest, createdBy string) (*models.Project, error) {
	// If a ManagerID isn't provided, default to the creator
	managerID := req.ManagerID
	if managerID == "" {
		managerID = createdBy
	}

	status := req.Status
	if status == "" {
		status = models.ProjectStatusPlanning
	}
	project := &models.Project{
		Name:        req.Name,
		Description: req.Description,
		Location:    req.Location,
		Budget:      req.Budget,
		ManagerID:   managerID,
		CreatedBy:   createdBy,
		Status:      status,
		Category:    req.Category,
		Timeline:    req.Timeline,
		TeamSize:    req.TeamSize,
		Engineer:    req.Engineer,
	}

	if req.StartDate != "" {
		t, err := time.Parse("2006-01-02", req.StartDate)
		if err == nil {
			project.StartDate = &t
		}
	}
	if req.EndDate != "" {
		t, err := time.Parse("2006-01-02", req.EndDate)
		if err == nil {
			project.EndDate = &t
		}
	}

	err := s.repo.Create(ctx, project)
	if err != nil {
		return nil, err
	}

	// Re-fetch to get the Manager relation populated
	return s.repo.GetByID(ctx, project.ID)
}

func (s *service) GetProjectByID(ctx context.Context, id string) (*models.Project, error) {
	project, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrProjectNotFound
	}
	return project, nil
}

func (s *service) GetAllProjects(ctx context.Context) ([]models.Project, error) {
	return s.repo.GetAll(ctx)
}

func (s *service) GetProjectsByManager(ctx context.Context, managerID string) ([]models.Project, error) {
	return s.repo.GetByManagerID(ctx, managerID)
}

func (s *service) UpdateProject(ctx context.Context, id string, req UpdateProjectRequest) (*models.Project, error) {
	project, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, ErrProjectNotFound
	}

	if req.Name != nil {
		project.Name = *req.Name
	}
	if req.Description != nil {
		project.Description = *req.Description
	}
	if req.Location != nil {
		project.Location = *req.Location
	}
	if req.Status != nil {
		project.Status = *req.Status
	}
	if req.Budget != nil {
		project.Budget = *req.Budget
	}
	if req.ManagerID != nil {
		project.ManagerID = *req.ManagerID
	}
	if req.Category != nil {
		project.Category = *req.Category
	}
	if req.Timeline != nil {
		project.Timeline = *req.Timeline
	}
	if req.TeamSize != nil {
		project.TeamSize = *req.TeamSize
	}
	if req.Engineer != nil {
		project.Engineer = *req.Engineer
	}
	if req.StartDate != nil {
		t, err := time.Parse("2006-01-02", *req.StartDate)
		if err == nil {
			project.StartDate = &t
		}
	}
	if req.EndDate != nil {
		t, err := time.Parse("2006-01-02", *req.EndDate)
		if err == nil {
			project.EndDate = &t
		}
	}

	err = s.repo.Update(ctx, project)
	if err != nil {
		return nil, err
	}

	return s.repo.GetByID(ctx, project.ID)
}

func (s *service) DeleteProject(ctx context.Context, id string) error {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return ErrProjectNotFound
	}
	return s.repo.Delete(ctx, id)
}
