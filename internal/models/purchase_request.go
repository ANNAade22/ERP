package models

import (
	"time"

	"gorm.io/gorm"
)

type PurchaseRequestStatus string

const (
	PurchaseRequestPending  PurchaseRequestStatus = "PENDING"
	PurchaseRequestApproved PurchaseRequestStatus = "APPROVED"
	PurchaseRequestRejected PurchaseRequestStatus = "REJECTED"
	PurchaseRequestOrdered  PurchaseRequestStatus = "ORDERED"
	PurchaseRequestReceived PurchaseRequestStatus = "RECEIVED"
)

// PurchaseRequest represents a material procurement request with approval workflow
type PurchaseRequest struct {
	ID           string                `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	MaterialID   string                `gorm:"type:uuid;not null" json:"material_id"`
	Material     *Material             `gorm:"foreignKey:MaterialID" json:"material,omitempty"`
	ProjectID    string                `gorm:"type:uuid;not null" json:"project_id"`
	Project      *Project              `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	VendorID     *string               `gorm:"type:uuid" json:"vendor_id,omitempty"`
	Vendor       *Vendor               `gorm:"foreignKey:VendorID" json:"vendor,omitempty"`
	Quantity     float64               `gorm:"type:decimal(15,2);not null" json:"quantity"`
	UnitPrice    float64               `gorm:"type:decimal(15,2);default:0" json:"unit_price"`
	TotalPrice   float64               `gorm:"type:decimal(15,2);default:0" json:"total_price"`
	Status       PurchaseRequestStatus `gorm:"type:varchar(20);default:'PENDING'" json:"status"`
	Notes        string                `gorm:"type:text" json:"notes"`
	RequestedBy  string                `gorm:"type:uuid;not null" json:"requested_by"`
	Requester    *User                 `gorm:"foreignKey:RequestedBy" json:"requester,omitempty"`
	ApprovedBy   *string               `gorm:"type:uuid" json:"approved_by,omitempty"`
	CreatedAt    time.Time             `json:"created_at"`
	UpdatedAt    time.Time             `json:"updated_at"`
	DeletedAt    gorm.DeletedAt        `gorm:"index" json:"-"`
}
