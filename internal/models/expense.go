package models

import (
	"time"

	"gorm.io/gorm"
)

type ExpenseCategory string

const (
	ExpenseCategoryLabour    ExpenseCategory = "LABOUR"
	ExpenseCategoryMaterial  ExpenseCategory = "MATERIAL"
	ExpenseCategoryTransport ExpenseCategory = "TRANSPORT"
	ExpenseCategoryEquipment ExpenseCategory = "EQUIPMENT"
	ExpenseCategoryOverhead  ExpenseCategory = "OVERHEAD"
	ExpenseCategoryOther     ExpenseCategory = "OTHER"
)

type ExpenseStatus string

const (
	ExpenseStatusPending  ExpenseStatus = "PENDING"
	ExpenseStatusApproved ExpenseStatus = "APPROVED"
	ExpenseStatusRejected ExpenseStatus = "REJECTED"
)

// Expense represents a financial transaction linked to a project
type Expense struct {
	ID          string          `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	ProjectID   string          `gorm:"type:uuid;not null" json:"project_id"`
	Project     *Project        `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	Category    ExpenseCategory `gorm:"type:varchar(50);not null" json:"category"`
	Amount      float64         `gorm:"type:decimal(15,2);not null" json:"amount"`
	Description string          `gorm:"type:text" json:"description"`
	Date        time.Time       `gorm:"type:date;not null" json:"date"`
	Status      ExpenseStatus   `gorm:"type:varchar(20);default:'PENDING'" json:"status"`
	CreatedBy   string          `gorm:"type:uuid;not null" json:"created_by"`
	Creator     *User           `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	ApprovedBy  *string         `gorm:"type:uuid" json:"approved_by,omitempty"`
	CreatedAt   time.Time       `json:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at"`
	DeletedAt   gorm.DeletedAt  `gorm:"index" json:"-"`
}
