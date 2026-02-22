package projects

import (
	"context"

	"erp-project/internal/models"

	"gorm.io/gorm"
)

type Repository interface {
	Create(ctx context.Context, project *models.Project) error
	GetByID(ctx context.Context, id string) (*models.Project, error)
	GetAll(ctx context.Context) ([]models.Project, error)
	GetByManagerID(ctx context.Context, managerID string) ([]models.Project, error)
	Update(ctx context.Context, project *models.Project) error
	Delete(ctx context.Context, id string) error
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(ctx context.Context, project *models.Project) error {
	return r.db.WithContext(ctx).Create(project).Error
}

func (r *repository) GetByID(ctx context.Context, id string) (*models.Project, error) {
	var project models.Project
	err := r.db.WithContext(ctx).Preload("Manager").Where("id = ?", id).First(&project).Error
	if err != nil {
		return nil, err
	}
	return &project, nil
}

func (r *repository) GetAll(ctx context.Context) ([]models.Project, error) {
	var projects []models.Project
	err := r.db.WithContext(ctx).Preload("Manager").Find(&projects).Error
	return projects, err
}

func (r *repository) GetByManagerID(ctx context.Context, managerID string) ([]models.Project, error) {
	var projects []models.Project
	err := r.db.WithContext(ctx).Preload("Manager").Where("manager_id = ?", managerID).Find(&projects).Error
	return projects, err
}

func (r *repository) Update(ctx context.Context, project *models.Project) error {
	return r.db.WithContext(ctx).Save(project).Error
}

func (r *repository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.Project{}).Error
}
