package models

import (
	"time"

	"gorm.io/gorm"
)

type MilestonePriority string

const (
	MilestonePriorityLow    MilestonePriority = "Low"
	MilestonePriorityMedium MilestonePriority = "Medium"
	MilestonePriorityHigh   MilestonePriority = "High"
)

type MilestoneStatus string

const (
	MilestoneStatusUpcoming   MilestoneStatus = "Upcoming"
	MilestoneStatusInProgress MilestoneStatus = "In Progress"
	MilestoneStatusCompleted  MilestoneStatus = "Completed"
	MilestoneStatusAtRisk     MilestoneStatus = "At Risk"
)

type Milestone struct {
	ID           string            `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	ProjectID    string            `gorm:"type:uuid;not null;index" json:"project_id"`
	Title        string            `gorm:"type:varchar(255);not null" json:"title"`
	Description  string            `gorm:"type:text" json:"description"`
	DueDate      *time.Time        `gorm:"type:date" json:"due_date"`
	PlannedStart *time.Time        `gorm:"type:date" json:"planned_start"`
	PlannedEnd   *time.Time        `gorm:"type:date" json:"planned_end"`
	Priority     MilestonePriority `gorm:"type:varchar(50);default:'Medium';not null" json:"priority"`
	Assignee    string            `gorm:"type:varchar(255)" json:"assignee"`
	Progress    float64           `gorm:"type:decimal(5,2);default:0" json:"progress"`
	Status      MilestoneStatus   `gorm:"type:varchar(50);default:'Upcoming';not null" json:"status"`
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
	DeletedAt   gorm.DeletedAt    `gorm:"index" json:"-"`
}
