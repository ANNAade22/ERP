package projects

import (
	"context"

	"erp-project/internal/models"

	"gorm.io/gorm"
)

type PhotoRepository interface {
	Create(ctx context.Context, photo *models.SitePhoto) error
	GetByID(ctx context.Context, id string) (*models.SitePhoto, error)
	ListByProject(ctx context.Context, projectID string, milestoneID string) ([]models.SitePhoto, error)
	Delete(ctx context.Context, id string) error
}

type photoRepository struct {
	db *gorm.DB
}

func NewPhotoRepository(db *gorm.DB) PhotoRepository {
	return &photoRepository{db: db}
}

func (r *photoRepository) Create(ctx context.Context, photo *models.SitePhoto) error {
	return r.db.WithContext(ctx).Create(photo).Error
}

func (r *photoRepository) GetByID(ctx context.Context, id string) (*models.SitePhoto, error) {
	var photo models.SitePhoto
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&photo).Error
	if err != nil {
		return nil, err
	}
	return &photo, nil
}

func (r *photoRepository) ListByProject(ctx context.Context, projectID string, milestoneID string) ([]models.SitePhoto, error) {
	var photos []models.SitePhoto
	q := r.db.WithContext(ctx).Where("project_id = ?", projectID).Order("created_at DESC")
	if milestoneID != "" {
		q = q.Where("milestone_id = ?", milestoneID)
	}
	err := q.Find(&photos).Error
	return photos, err
}

func (r *photoRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.SitePhoto{}).Error
}
