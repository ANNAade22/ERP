package models

import (
	"time"

	"gorm.io/gorm"
)

// Vendor represents a material supplier
type Vendor struct {
	ID          string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name        string         `gorm:"type:varchar(255);not null" json:"name"`
	ContactName string         `gorm:"type:varchar(255)" json:"contact_name"`
	Phone       string         `gorm:"type:varchar(20)" json:"phone"`
	Email       string         `gorm:"type:varchar(255)" json:"email"`
	Address     string         `gorm:"type:text" json:"address"`
	GSTNumber   string         `gorm:"type:varchar(50)" json:"gst_number"`
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
