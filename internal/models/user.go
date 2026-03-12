package models

import (
	"time"

	"gorm.io/gorm"
)

type Role string

const (
	RoleAdmin          Role = "ADMIN"
	RoleProjectManager Role = "PROJECT_MANAGER"
	RoleSiteEngineer   Role = "SITE_ENGINEER"
	RoleAccountant     Role = "ACCOUNTANT"
	RoleStoreOfficer   Role = "STORE_OFFICER"
)

type User struct {
	ID           string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name         string         `gorm:"type:varchar(255);not null" json:"name"`
	Email        string         `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	Phone        string         `gorm:"type:varchar(50)" json:"phone"`
	PasswordHash string         `gorm:"type:varchar(255);not null" json:"-"`
	Role         Role           `gorm:"type:varchar(50);not null" json:"role"`
	Active       bool           `gorm:"default:true;not null" json:"active"`
	AvatarPath   string         `gorm:"type:varchar(512)" json:"avatar_path,omitempty"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
