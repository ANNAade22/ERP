package models

import (
	"time"

	"gorm.io/gorm"
)

type PaymentMethod string

const (
	PaymentMethodBankTransfer PaymentMethod = "BANK_TRANSFER"
	PaymentMethodCheque       PaymentMethod = "CHEQUE"
	PaymentMethodCreditCard   PaymentMethod = "CREDIT_CARD"
	PaymentMethodCash         PaymentMethod = "CASH"
	PaymentMethodOther        PaymentMethod = "OTHER"
)

// Payment represents a payment recorded against a vendor invoice
type Payment struct {
	ID              string        `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	InvoiceID       string        `gorm:"type:uuid;not null;index" json:"invoice_id"`
	Invoice         *Invoice      `gorm:"foreignKey:InvoiceID" json:"invoice,omitempty"`
	Amount          float64       `gorm:"type:decimal(15,2);not null" json:"amount"`
	PaymentDate     time.Time     `gorm:"type:date;not null" json:"payment_date"`
	PaymentMethod   PaymentMethod `gorm:"type:varchar(30);not null" json:"payment_method"`
	ReferenceNumber string        `gorm:"type:varchar(100);not null" json:"reference_number"`
	CreatedAt       time.Time     `json:"created_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}
