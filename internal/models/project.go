package models

import (
	"time"

	"gorm.io/gorm"
)

type ProjectStatus string

const (
	ProjectStatusPlanning   ProjectStatus = "PLANNING"
	ProjectStatusInProgress ProjectStatus = "IN_PROGRESS"
	ProjectStatusOnHold     ProjectStatus = "ON_HOLD"
	ProjectStatusCompleted  ProjectStatus = "COMPLETED"
	ProjectStatusCancelled  ProjectStatus = "CANCELLED"
)

type Project struct {
	ID          string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name        string         `gorm:"type:varchar(255);not null" json:"name"`
	Description string         `gorm:"type:text" json:"description"`
	Location    string         `gorm:"type:varchar(255)" json:"location"`
	Status      ProjectStatus  `gorm:"type:varchar(50);default:'PLANNING';not null" json:"status"`
	Budget      float64        `gorm:"type:decimal(15,2);default:0" json:"budget"`
	SpentAmount float64        `gorm:"type:decimal(15,2);default:0" json:"spent_amount"`
	StartDate   *time.Time     `gorm:"type:date" json:"start_date"`
	EndDate     *time.Time     `gorm:"type:date" json:"end_date"`
	Category    string         `gorm:"type:varchar(100)" json:"category"`
	Timeline    string         `gorm:"type:varchar(100)" json:"timeline"`
	TeamSize    int            `gorm:"type:int" json:"team_size"`
	Engineer    string         `gorm:"type:varchar(255)" json:"engineer"`
	ManagerID   string         `gorm:"type:uuid;not null" json:"manager_id"`
	Manager     *User          `gorm:"foreignKey:ManagerID" json:"manager,omitempty"`
	CreatedBy   string         `gorm:"type:uuid;not null" json:"created_by"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	Milestones []Milestone `gorm:"foreignKey:ProjectID" json:"milestones,omitempty"`
}
