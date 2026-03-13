package models

import (
	"time"

	"gorm.io/gorm"
)

type InvoiceStatus string

const (
	InvoiceStatusPending       InvoiceStatus = "PENDING"
	InvoiceStatusPartiallyPaid InvoiceStatus = "PARTIALLY_PAID"
	InvoiceStatusPaid          InvoiceStatus = "PAID"
	InvoiceStatusOverdue       InvoiceStatus = "OVERDUE"
)

// Invoice represents a vendor invoice for AP tracking
type Invoice struct {
	ID                 string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	VendorID           string         `gorm:"type:uuid;not null" json:"vendor_id"`
	Vendor             *Vendor        `gorm:"foreignKey:VendorID" json:"vendor,omitempty"`
	ProjectID          string         `gorm:"type:uuid;not null" json:"project_id"`
	Project            *Project       `gorm:"foreignKey:ProjectID" json:"project,omitempty"`
	PurchaseRequestID  *string        `gorm:"type:uuid" json:"purchase_request_id,omitempty"`
	PurchaseRequest    *PurchaseRequest `gorm:"foreignKey:PurchaseRequestID" json:"purchase_request,omitempty"`
	InvoiceNumber      string         `gorm:"type:varchar(100);not null;index" json:"invoice_number"`
	TotalAmount        float64        `gorm:"type:decimal(15,2);not null" json:"total_amount"`
	RemainingAmount    float64        `gorm:"type:decimal(15,2);not null" json:"remaining_amount"`
	IssueDate          time.Time      `gorm:"type:date;not null" json:"issue_date"`
	DueDate            time.Time      `gorm:"type:date;not null" json:"due_date"`
	PaymentTerms       string         `gorm:"type:varchar(100)" json:"payment_terms"`
	Description        string         `gorm:"type:text" json:"description"`
	Status             InvoiceStatus  `gorm:"type:varchar(30);default:'PENDING'" json:"status"`
	CreatedBy          string         `gorm:"type:uuid" json:"created_by"`
	Creator            *User          `gorm:"foreignKey:CreatedBy" json:"creator,omitempty"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`

	Payments           []Payment      `gorm:"foreignKey:InvoiceID" json:"payments,omitempty"`
}
