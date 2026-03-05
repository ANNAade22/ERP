package projects

import (
	"context"

	"erp-project/internal/models"

	"gorm.io/gorm"
)

type MilestoneRepository interface {
	Create(ctx context.Context, milestone *models.Milestone) error
	GetByID(ctx context.Context, id string) (*models.Milestone, error)
	GetByProjectID(ctx context.Context, projectID string) ([]models.Milestone, error)
	Update(ctx context.Context, milestone *models.Milestone) error
	Delete(ctx context.Context, id string) error
	GetDashboardStats(ctx context.Context) (map[string]interface{}, error)
}

type milestoneRepository struct {
	db *gorm.DB
}

func NewMilestoneRepository(db *gorm.DB) MilestoneRepository {
	return &milestoneRepository{db: db}
}

func (r *milestoneRepository) Create(ctx context.Context, milestone *models.Milestone) error {
	return r.db.WithContext(ctx).Create(milestone).Error
}

func (r *milestoneRepository) GetByID(ctx context.Context, id string) (*models.Milestone, error) {
	var milestone models.Milestone
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&milestone).Error
	if err != nil {
		return nil, err
	}
	return &milestone, nil
}

func (r *milestoneRepository) GetByProjectID(ctx context.Context, projectID string) ([]models.Milestone, error) {
	var milestones []models.Milestone
	err := r.db.WithContext(ctx).Where("project_id = ?", projectID).Order("due_date ASC").Find(&milestones).Error
	return milestones, err
}

func (r *milestoneRepository) Update(ctx context.Context, milestone *models.Milestone) error {
	return r.db.WithContext(ctx).Save(milestone).Error
}

func (r *milestoneRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.Milestone{}).Error
}

func (r *milestoneRepository) GetDashboardStats(ctx context.Context) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	var total int64
	r.db.WithContext(ctx).Model(&models.Milestone{}).Count(&total)

	var completed int64
	r.db.WithContext(ctx).Model(&models.Milestone{}).Where("status = ?", models.MilestoneStatusCompleted).Count(&completed)

	var atRisk int64
	r.db.WithContext(ctx).Model(&models.Milestone{}).Where("status = ?", models.MilestoneStatusAtRisk).Count(&atRisk)

	var upcoming int64
	r.db.WithContext(ctx).Model(&models.Milestone{}).Where("status = ?", models.MilestoneStatusUpcoming).Count(&upcoming)

	stats["total"] = total
	stats["completed"] = completed
	stats["at_risk"] = atRisk
	stats["upcoming"] = upcoming

	if total > 0 {
		stats["success_rate"] = float64(completed) / float64(total) * 100
	} else {
		stats["success_rate"] = 0.0
	}

	return stats, nil
}
