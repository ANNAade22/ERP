package models

import (
	"time"

	"gorm.io/gorm"
)

// VendorStatus represents vendor lifecycle/priority
type VendorStatus string

const (
	VendorStatusActive   VendorStatus = "ACTIVE"
	VendorStatusPreferred VendorStatus = "PREFERRED"
	VendorStatusInactive VendorStatus = "INACTIVE"
)

// Vendor represents a material supplier, contractor, or service provider
type Vendor struct {
	ID          string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name        string         `gorm:"type:varchar(255);not null" json:"name"`
	ContactName string         `gorm:"type:varchar(255)" json:"contact_name"`
	Phone       string         `gorm:"type:varchar(20)" json:"phone"`
	Email       string         `gorm:"type:varchar(255)" json:"email"`
	Address     string         `gorm:"type:text" json:"address"`
	GSTNumber   string         `gorm:"type:varchar(50)" json:"gst_number"`
	Type        string         `gorm:"type:varchar(50);default:''" json:"type"`           // e.g. KSO, Supplier, Contractor (Category in UI)
	Status      VendorStatus   `gorm:"type:varchar(20);default:'ACTIVE'" json:"status"`   // ACTIVE, PREFERRED, INACTIVE
	Rating      int            `gorm:"type:int;default:0" json:"rating"`                 // 0-5
	Description string         `gorm:"type:text" json:"description"`                     // short description
	IsActive    bool           `gorm:"default:true" json:"is_active"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
