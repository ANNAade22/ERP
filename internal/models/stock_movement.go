package models

import (
	"time"

	"gorm.io/gorm"
)

type MovementType string

const (
	MovementTypeIn  MovementType = "IN"
	MovementTypeOut MovementType = "OUT"
)

// StockMovement logs every stock change for audit trail
type StockMovement struct {
	ID           string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	MaterialID   string         `gorm:"type:uuid;not null" json:"material_id"`
	Material     *Material      `gorm:"foreignKey:MaterialID" json:"material,omitempty"`
	ProjectID    string         `gorm:"type:uuid;not null" json:"project_id"`
	MovementType MovementType   `gorm:"type:varchar(10);not null" json:"movement_type"`
	Quantity     float64        `gorm:"type:decimal(15,2);not null" json:"quantity"`
	Reason       string         `gorm:"type:text" json:"reason"`
	ReferenceID  *string        `gorm:"type:uuid" json:"reference_id,omitempty"` // Links to PurchaseRequest if applicable
	PerformedBy  string         `gorm:"type:uuid;not null" json:"performed_by"`
	CreatedAt    time.Time      `json:"created_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
