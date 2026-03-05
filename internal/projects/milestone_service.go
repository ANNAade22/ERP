package projects

import (
	"context"

	"erp-project/internal/models"
)

type MilestoneService interface {
	CreateMilestone(ctx context.Context, milestone *models.Milestone) error
	GetMilestone(ctx context.Context, id string) (*models.Milestone, error)
	GetProjectMilestones(ctx context.Context, projectID string) ([]models.Milestone, error)
	UpdateMilestone(ctx context.Context, milestone *models.Milestone) error
	DeleteMilestone(ctx context.Context, id string) error
	GetDashboardStats(ctx context.Context) (map[string]interface{}, error)
}

type milestoneService struct {
	repo MilestoneRepository
}

func NewMilestoneService(repo MilestoneRepository) MilestoneService {
	return &milestoneService{repo: repo}
}

func (s *milestoneService) CreateMilestone(ctx context.Context, milestone *models.Milestone) error {
	return s.repo.Create(ctx, milestone)
}

func (s *milestoneService) GetMilestone(ctx context.Context, id string) (*models.Milestone, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *milestoneService) GetProjectMilestones(ctx context.Context, projectID string) ([]models.Milestone, error) {
	return s.repo.GetByProjectID(ctx, projectID)
}

func (s *milestoneService) UpdateMilestone(ctx context.Context, milestone *models.Milestone) error {
	return s.repo.Update(ctx, milestone)
}

func (s *milestoneService) DeleteMilestone(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *milestoneService) GetDashboardStats(ctx context.Context) (map[string]interface{}, error) {
	return s.repo.GetDashboardStats(ctx)
}
