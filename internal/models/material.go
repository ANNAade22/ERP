package models

import (
	"time"

	"gorm.io/gorm"
)

type MaterialUnit string

const (
	MaterialUnitKG    MaterialUnit = "KG"
	MaterialUnitTon   MaterialUnit = "TON"
	MaterialUnitBag   MaterialUnit = "BAG"
	MaterialUnitPiece MaterialUnit = "PIECE"
	MaterialUnitLitre MaterialUnit = "LITRE"
	MaterialUnitCFT   MaterialUnit = "CFT"
	MaterialUnitSQFT  MaterialUnit = "SQFT"
	MaterialUnitOther MaterialUnit = "OTHER"
)

// Material represents inventory items tracked across projects
type Material struct {
	ID           string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name         string         `gorm:"type:varchar(255);not null" json:"name"`
	Unit         MaterialUnit   `gorm:"type:varchar(20);not null" json:"unit"`
	CurrentStock float64        `gorm:"type:decimal(15,2);default:0" json:"current_stock"`
	MinStock     float64        `gorm:"type:decimal(15,2);default:0" json:"min_stock"`
	ProjectID    string         `gorm:"type:uuid;not null" json:"project_id"`
	Project      *Project       `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
