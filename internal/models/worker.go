package models

import (
	"time"

	"gorm.io/gorm"
)

type WorkerType string

const (
	WorkerTypeLabour     WorkerType = "LABOUR"
	WorkerTypeMason      WorkerType = "MASON"
	WorkerTypeElectrician WorkerType = "ELECTRICIAN"
	WorkerTypePlumber    WorkerType = "PLUMBER"
	WorkerTypeSupervisor WorkerType = "SUPERVISOR"
	WorkerTypeOther      WorkerType = "OTHER"
)

// Worker represents a construction site worker (not a system user)
type Worker struct {
	ID          string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name        string         `gorm:"type:varchar(255);not null" json:"name"`
	Phone       string         `gorm:"type:varchar(20)" json:"phone"`
	WorkerType  WorkerType     `gorm:"type:varchar(50);not null" json:"worker_type"`
	DailyWage   float64        `gorm:"type:decimal(10,2);default:0" json:"daily_wage"`
	ProjectID   string         `gorm:"type:uuid;not null" json:"project_id"`
	Project     *Project       `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
