package models

import (
	"time"

	"gorm.io/gorm"
)

// SitePhoto stores progress/work photos uploaded by site engineers for a project (optionally linked to a milestone).
type SitePhoto struct {
	ID          string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	ProjectID   string         `gorm:"type:uuid;not null;index" json:"project_id"`
	MilestoneID string         `gorm:"type:uuid;index" json:"milestone_id,omitempty"`
	UploadedBy  string         `gorm:"type:uuid;not null" json:"uploaded_by"`
	FilePath    string         `gorm:"type:varchar(512);not null" json:"file_path"`
	Caption     string         `gorm:"type:varchar(500)" json:"caption"`
	CreatedAt   time.Time      `json:"created_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	// Optional: preload uploader name (not a FK in DB for simplicity)
	UploaderName string `gorm:"-" json:"uploader_name,omitempty"`
}
