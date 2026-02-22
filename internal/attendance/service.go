package attendance

import (
	"context"
	"errors"
	"time"

	"erp-project/internal/models"
)

var (
	ErrWorkerNotFound     = errors.New("worker not found")
	ErrAttendanceNotFound = errors.New("attendance record not found")
)

// --- Request DTOs ---

type CreateWorkerRequest struct {
	Name       string           `json:"name" binding:"required"`
	Phone      string           `json:"phone"`
	WorkerType models.WorkerType `json:"worker_type" binding:"required"`
	DailyWage  float64          `json:"daily_wage" binding:"gte=0"`
	ProjectID  string           `json:"project_id" binding:"required"`
}

type MarkAttendanceRequest struct {
	WorkerID  string                 `json:"worker_id" binding:"required"`
	ProjectID string                 `json:"project_id" binding:"required"`
	Date      string                 `json:"date" binding:"required"` // YYYY-MM-DD
	Status    models.AttendanceStatus `json:"status" binding:"required"`
	CheckIn   string                 `json:"check_in"`  // RFC3339
}

type CheckOutRequest struct {
	CheckOut string `json:"check_out" binding:"required"` // RFC3339
}

// --- Service interface ---

type Service interface {
	// Workers
	CreateWorker(ctx context.Context, req CreateWorkerRequest) (*models.Worker, error)
	GetWorkersByProject(ctx context.Context, projectID string) ([]models.Worker, error)

	// Attendance
	MarkAttendance(ctx context.Context, req MarkAttendanceRequest, markedBy string) (*models.Attendance, error)
	CheckOut(ctx context.Context, attendanceID string, req CheckOutRequest) error
	GetAttendanceByDate(ctx context.Context, projectID string, date string) ([]models.Attendance, error)
	GetAttendanceByWorker(ctx context.Context, workerID string, from, to string) ([]models.Attendance, error)
}

type service struct {
	repo Repository
}

func NewService(repo Repository) Service {
	return &service{repo: repo}
}

// --- Worker methods ---

func (s *service) CreateWorker(ctx context.Context, req CreateWorkerRequest) (*models.Worker, error) {
	worker := &models.Worker{
		Name:       req.Name,
		Phone:      req.Phone,
		WorkerType: req.WorkerType,
		DailyWage:  req.DailyWage,
		ProjectID:  req.ProjectID,
		IsActive:   true,
	}

	err := s.repo.CreateWorker(ctx, worker)
	if err != nil {
		return nil, err
	}

	return s.repo.GetWorkerByID(ctx, worker.ID)
}

func (s *service) GetWorkersByProject(ctx context.Context, projectID string) ([]models.Worker, error) {
	return s.repo.GetWorkersByProject(ctx, projectID)
}

// --- Attendance methods ---

func (s *service) MarkAttendance(ctx context.Context, req MarkAttendanceRequest, markedBy string) (*models.Attendance, error) {
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return nil, errors.New("invalid date format, use YYYY-MM-DD")
	}

	record := &models.Attendance{
		WorkerID:  req.WorkerID,
		ProjectID: req.ProjectID,
		Date:      date,
		Status:    req.Status,
		MarkedBy:  markedBy,
	}

	// Parse optional check-in time
	if req.CheckIn != "" {
		t, err := time.Parse(time.RFC3339, req.CheckIn)
		if err == nil {
			record.CheckIn = &t
		}
	}

	err = s.repo.MarkAttendance(ctx, record)
	if err != nil {
		return nil, err
	}

	return record, nil
}

func (s *service) CheckOut(ctx context.Context, attendanceID string, req CheckOutRequest) error {
	t, err := time.Parse(time.RFC3339, req.CheckOut)
	if err != nil {
		return errors.New("invalid check_out format, use RFC3339")
	}
	return s.repo.CheckOut(ctx, attendanceID, t)
}

func (s *service) GetAttendanceByDate(ctx context.Context, projectID string, date string) ([]models.Attendance, error) {
	d, err := time.Parse("2006-01-02", date)
	if err != nil {
		return nil, errors.New("invalid date format, use YYYY-MM-DD")
	}
	return s.repo.GetAttendanceByDate(ctx, projectID, d)
}

func (s *service) GetAttendanceByWorker(ctx context.Context, workerID string, from, to string) ([]models.Attendance, error) {
	f, err := time.Parse("2006-01-02", from)
	if err != nil {
		return nil, errors.New("invalid from date format, use YYYY-MM-DD")
	}
	t, err := time.Parse("2006-01-02", to)
	if err != nil {
		return nil, errors.New("invalid to date format, use YYYY-MM-DD")
	}
	return s.repo.GetAttendanceByWorker(ctx, workerID, f, t)
}
