package models

import (
	"time"

	"gorm.io/gorm"
)

type AttendanceStatus string

const (
	AttendanceStatusPresent  AttendanceStatus = "PRESENT"
	AttendanceStatusAbsent   AttendanceStatus = "ABSENT"
	AttendanceStatusHalfDay  AttendanceStatus = "HALF_DAY"
)

// Attendance tracks daily check-in/check-out for workers
type Attendance struct {
	ID        string           `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	WorkerID  string           `gorm:"type:uuid;not null" json:"worker_id"`
	Worker    *Worker          `gorm:"foreignKey:WorkerID" json:"worker,omitempty"`
	ProjectID string           `gorm:"type:uuid;not null" json:"project_id"`
	Project   *Project         `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Date      time.Time        `gorm:"type:date;not null" json:"date"`
	CheckIn   *time.Time       `gorm:"type:timestamptz" json:"check_in"`
	CheckOut  *time.Time       `gorm:"type:timestamptz" json:"check_out"`
	Status    AttendanceStatus `gorm:"type:varchar(20);not null;default:'PRESENT'" json:"status"`
	MarkedBy  string           `gorm:"type:uuid;not null" json:"marked_by"` // User who marked it
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
	DeletedAt gorm.DeletedAt   `gorm:"index" json:"-"`
}
