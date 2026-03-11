package models

import (
	"time"

	"gorm.io/gorm"
)

type EquipmentStatus string

const (
	EquipmentStatusActive      EquipmentStatus = "ACTIVE"
	EquipmentStatusMaintenance EquipmentStatus = "MAINTENANCE"
	EquipmentStatusInactive    EquipmentStatus = "INACTIVE"
)

type EquipmentType string

const (
	EquipmentTypeRoadEquipment    EquipmentType = "Road Equipment"
	EquipmentTypeDeliveryVehicle  EquipmentType = "Delivery Vehicle"
	EquipmentTypeExcavator        EquipmentType = "Excavator"
	EquipmentTypeCrane            EquipmentType = "Crane"
	EquipmentTypeOther            EquipmentType = "Other"
)

type Equipment struct {
	ID            string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name          string         `gorm:"type:varchar(255);not null" json:"name"`
	Type          EquipmentType  `gorm:"type:varchar(100);not null" json:"type"`
	Manufacturer  string         `gorm:"type:varchar(255)" json:"manufacturer"`
	Model         string         `gorm:"type:varchar(255)" json:"model"`
	SerialNumber  string         `gorm:"type:varchar(255)" json:"serial_number"`
	PurchaseDate  *time.Time     `gorm:"type:date" json:"purchase_date"`
	Status        EquipmentStatus `gorm:"type:varchar(50);default:'ACTIVE';not null" json:"status"`
	Location      string         `gorm:"type:varchar(500)" json:"location"`
	LastServiceAt *time.Time     `gorm:"type:date" json:"last_service_at"`
	Notes         string         `gorm:"type:text" json:"notes"`
	ProjectID     *string        `gorm:"type:uuid" json:"project_id,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}
