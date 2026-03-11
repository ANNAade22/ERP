package models

import (
	"time"

	"gorm.io/gorm"
)

type EquipmentSchedule struct {
	ID           string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	ProjectID    string         `gorm:"type:uuid;not null;index" json:"project_id"`
	EquipmentID  string         `gorm:"type:uuid;not null;index" json:"equipment_id"`
	OperatorName string         `gorm:"type:varchar(255);not null" json:"operator_name"`
	ScheduleDate time.Time      `gorm:"type:date;not null" json:"schedule_date"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
