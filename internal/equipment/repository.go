package equipment

import (
	"context"
	"time"

	"erp-project/internal/models"

	"gorm.io/gorm"
)

type Repository interface {
	// Equipment
	CreateEquipment(ctx context.Context, eq *models.Equipment) error
	GetEquipmentByID(ctx context.Context, id string) (*models.Equipment, error)
	ListEquipment(ctx context.Context, status string, projectID string) ([]models.Equipment, error)
	UpdateEquipment(ctx context.Context, eq *models.Equipment) error
	DeleteEquipment(ctx context.Context, id string) error
	CountByStatus(ctx context.Context, status models.EquipmentStatus) (int64, error)
	CountAll(ctx context.Context) (int64, error)

	// Maintenance
	CreateMaintenance(ctx context.Context, m *models.MaintenanceTask) error
	GetMaintenanceByID(ctx context.Context, id string) (*models.MaintenanceTask, error)
	ListMaintenanceByEquipment(ctx context.Context, equipmentID string) ([]models.MaintenanceTask, error)
	ListUpcomingMaintenance(ctx context.Context, limit int) ([]models.MaintenanceTask, error)
	UpdateMaintenance(ctx context.Context, m *models.MaintenanceTask) error
	DeleteMaintenance(ctx context.Context, id string) error

	// Schedule
	CreateSchedule(ctx context.Context, s *models.EquipmentSchedule) error
	GetScheduleByID(ctx context.Context, id string) (*models.EquipmentSchedule, error)
	ListScheduled(ctx context.Context) ([]models.EquipmentSchedule, error)
	UpdateSchedule(ctx context.Context, s *models.EquipmentSchedule) error
	DeleteSchedule(ctx context.Context, id string) error
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) CreateEquipment(ctx context.Context, eq *models.Equipment) error {
	return r.db.WithContext(ctx).Create(eq).Error
}

func (r *repository) GetEquipmentByID(ctx context.Context, id string) (*models.Equipment, error) {
	var eq models.Equipment
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&eq).Error
	if err != nil {
		return nil, err
	}
	return &eq, nil
}

func (r *repository) ListEquipment(ctx context.Context, status string, projectID string) ([]models.Equipment, error) {
	var list []models.Equipment
	query := r.db.WithContext(ctx).Model(&models.Equipment{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	if projectID != "" {
		query = query.Where("project_id = ?", projectID)
	}
	err := query.Order("created_at DESC").Find(&list).Error
	return list, err
}

func (r *repository) UpdateEquipment(ctx context.Context, eq *models.Equipment) error {
	return r.db.WithContext(ctx).Save(eq).Error
}

func (r *repository) DeleteEquipment(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.Equipment{}).Error
}

func (r *repository) CountByStatus(ctx context.Context, status models.EquipmentStatus) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Equipment{}).Where("status = ?", status).Count(&count).Error
	return count, err
}

func (r *repository) CountAll(ctx context.Context) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.Equipment{}).Count(&count).Error
	return count, err
}

func (r *repository) CreateMaintenance(ctx context.Context, m *models.MaintenanceTask) error {
	return r.db.WithContext(ctx).Create(m).Error
}

func (r *repository) GetMaintenanceByID(ctx context.Context, id string) (*models.MaintenanceTask, error) {
	var m models.MaintenanceTask
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&m).Error
	if err != nil {
		return nil, err
	}
	return &m, nil
}

func (r *repository) ListMaintenanceByEquipment(ctx context.Context, equipmentID string) ([]models.MaintenanceTask, error) {
	var list []models.MaintenanceTask
	err := r.db.WithContext(ctx).
		Where("equipment_id = ?", equipmentID).
		Order("scheduled_at DESC").
		Find(&list).Error
	return list, err
}

func (r *repository) ListUpcomingMaintenance(ctx context.Context, limit int) ([]models.MaintenanceTask, error) {
	var list []models.MaintenanceTask
	now := time.Now()
	err := r.db.WithContext(ctx).
		Where("scheduled_at >= ? AND status IN ?", now, []models.MaintenanceStatus{models.MaintenanceStatusScheduled, models.MaintenanceStatusInProgress}).
		Order("scheduled_at ASC").
		Limit(limit).
		Find(&list).Error
	return list, err
}

func (r *repository) UpdateMaintenance(ctx context.Context, m *models.MaintenanceTask) error {
	return r.db.WithContext(ctx).Save(m).Error
}

func (r *repository) DeleteMaintenance(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.MaintenanceTask{}).Error
}

func (r *repository) CreateSchedule(ctx context.Context, s *models.EquipmentSchedule) error {
	return r.db.WithContext(ctx).Create(s).Error
}

func (r *repository) GetScheduleByID(ctx context.Context, id string) (*models.EquipmentSchedule, error) {
	var s models.EquipmentSchedule
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&s).Error
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *repository) ListScheduled(ctx context.Context) ([]models.EquipmentSchedule, error) {
	var list []models.EquipmentSchedule
	err := r.db.WithContext(ctx).
		Order("schedule_date DESC, created_at DESC").
		Find(&list).Error
	return list, err
}

func (r *repository) UpdateSchedule(ctx context.Context, s *models.EquipmentSchedule) error {
	return r.db.WithContext(ctx).Save(s).Error
}

func (r *repository) DeleteSchedule(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Where("id = ?", id).Delete(&models.EquipmentSchedule{}).Error
}
