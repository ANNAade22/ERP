package models

import (
	"time"

	"gorm.io/gorm"
)

type MaintenanceType string

const (
	MaintenanceTypeRepair       MaintenanceType = "Repair"
	MaintenanceTypeInspection   MaintenanceType = "Inspection"
	MaintenanceTypePreventive   MaintenanceType = "Preventive"
)

type MaintenanceStatus string

const (
	MaintenanceStatusScheduled   MaintenanceStatus = "SCHEDULED"
	MaintenanceStatusInProgress  MaintenanceStatus = "IN_PROGRESS"
	MaintenanceStatusCompleted   MaintenanceStatus = "COMPLETED"
	MaintenanceStatusCancelled   MaintenanceStatus = "CANCELLED"
)

type MaintenanceTask struct {
	ID            string           `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	EquipmentID   string           `gorm:"type:uuid;not null;index" json:"equipment_id"`
	Type          MaintenanceType  `gorm:"type:varchar(50);not null" json:"type"`
	ScheduledAt   *time.Time       `gorm:"type:date;not null" json:"scheduled_at"`
	AssignedTo    string           `gorm:"type:uuid" json:"assigned_to"`
	EstimatedHours float64         `gorm:"type:decimal(5,2);default:0" json:"estimated_hours"`
	Status        MaintenanceStatus `gorm:"type:varchar(50);default:'SCHEDULED';not null" json:"status"`
	CreatedAt     time.Time        `json:"created_at"`
	UpdatedAt     time.Time        `json:"updated_at"`
	DeletedAt     gorm.DeletedAt   `gorm:"index" json:"-"`
}
