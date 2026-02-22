package attendance

import (
	"context"
	"time"

	"erp-project/internal/models"

	"gorm.io/gorm"
)

type Repository interface {
	// Worker operations
	CreateWorker(ctx context.Context, worker *models.Worker) error
	GetWorkerByID(ctx context.Context, id string) (*models.Worker, error)
	GetWorkersByProject(ctx context.Context, projectID string) ([]models.Worker, error)
	UpdateWorker(ctx context.Context, worker *models.Worker) error

	// Attendance operations
	MarkAttendance(ctx context.Context, record *models.Attendance) error
	GetAttendanceByDate(ctx context.Context, projectID string, date time.Time) ([]models.Attendance, error)
	GetAttendanceByWorker(ctx context.Context, workerID string, from, to time.Time) ([]models.Attendance, error)
	CheckOut(ctx context.Context, id string, checkOutTime time.Time) error
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

// --- Worker operations ---

func (r *repository) CreateWorker(ctx context.Context, worker *models.Worker) error {
	return r.db.WithContext(ctx).Create(worker).Error
}

func (r *repository) GetWorkerByID(ctx context.Context, id string) (*models.Worker, error) {
	var worker models.Worker
	err := r.db.WithContext(ctx).Preload("Project").Where("id = ?", id).First(&worker).Error
	if err != nil {
		return nil, err
	}
	return &worker, nil
}

func (r *repository) GetWorkersByProject(ctx context.Context, projectID string) ([]models.Worker, error) {
	var workers []models.Worker
	err := r.db.WithContext(ctx).Where("project_id = ? AND is_active = ?", projectID, true).Find(&workers).Error
	return workers, err
}

func (r *repository) UpdateWorker(ctx context.Context, worker *models.Worker) error {
	return r.db.WithContext(ctx).Save(worker).Error
}

// --- Attendance operations ---

func (r *repository) MarkAttendance(ctx context.Context, record *models.Attendance) error {
	return r.db.WithContext(ctx).Create(record).Error
}

func (r *repository) GetAttendanceByDate(ctx context.Context, projectID string, date time.Time) ([]models.Attendance, error) {
	var records []models.Attendance
	err := r.db.WithContext(ctx).
		Preload("Worker").
		Where("project_id = ? AND date = ?", projectID, date).
		Find(&records).Error
	return records, err
}

func (r *repository) GetAttendanceByWorker(ctx context.Context, workerID string, from, to time.Time) ([]models.Attendance, error) {
	var records []models.Attendance
	err := r.db.WithContext(ctx).
		Where("worker_id = ? AND date BETWEEN ? AND ?", workerID, from, to).
		Order("date ASC").
		Find(&records).Error
	return records, err
}

func (r *repository) CheckOut(ctx context.Context, id string, checkOutTime time.Time) error {
	return r.db.WithContext(ctx).
		Model(&models.Attendance{}).
		Where("id = ?", id).
		Update("check_out", checkOutTime).Error
}
