package invoices

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"erp-project/internal/models"

	"gorm.io/gorm"
)

var (
	ErrInvoiceNotFound   = errors.New("invoice not found")
	ErrPaymentExceedsDue = errors.New("payment amount exceeds remaining amount")
	ErrInvalidAmount     = errors.New("payment amount must be positive")
)

type CreateInvoiceRequest struct {
	VendorID          string  `json:"vendor_id" binding:"required"`
	ProjectID         string  `json:"project_id" binding:"required"`
	PurchaseRequestID *string `json:"purchase_request_id"`
	TotalAmount       float64 `json:"total_amount" binding:"required,gt=0"`
	IssueDate         string  `json:"issue_date" binding:"required"`
	DueDate           string  `json:"due_date" binding:"required"`
	PaymentTerms      string  `json:"payment_terms"`
	Description       string  `json:"description"`
}

type RecordPaymentRequest struct {
	Amount          float64 `json:"amount" binding:"required,gt=0"`
	PaymentDate     string  `json:"payment_date" binding:"required"`
	PaymentMethod   string  `json:"payment_method" binding:"required"`
	ReferenceNumber string  `json:"reference_number" binding:"required"`
}

type InvoiceSummary struct {
	TotalAmount   float64 `json:"total_amount"`
	PaidAmount    float64 `json:"paid_amount"`
	PendingAmount float64 `json:"pending_amount"`
	OverdueAmount float64 `json:"overdue_amount"`
}

type ListInvoicesResponse struct {
	Summary  InvoiceSummary    `json:"summary"`
	Invoices []models.Invoice  `json:"invoices"`
	Total    int64             `json:"total"`
}

type Service interface {
	CreateInvoice(ctx context.Context, req CreateInvoiceRequest, createdBy string) (*models.Invoice, error)
	GetInvoice(ctx context.Context, id string) (*models.Invoice, error)
	ListInvoices(ctx context.Context, search, status string, limit, offset int) (*ListInvoicesResponse, error)
	RecordPayment(ctx context.Context, invoiceID string, req RecordPaymentRequest) (*models.Payment, error)
	GetSummary(ctx context.Context) (*InvoiceSummary, error)
	ListInvoicesForPayment(ctx context.Context) ([]models.Invoice, error)
}

type service struct {
	db *gorm.DB
	repo Repository
}

func NewService(db *gorm.DB, repo Repository) Service {
	return &service{db: db, repo: repo}
}

func generateInvoiceNumber() string {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	return fmt.Sprintf("INVOICE-%08d", r.Intn(100000000))
}

func (s *service) CreateInvoice(ctx context.Context, req CreateInvoiceRequest, createdBy string) (*models.Invoice, error) {
	issueDate, err := time.Parse("2006-01-02", req.IssueDate)
	if err != nil {
		issueDate, _ = time.Parse("02/01/2006", req.IssueDate)
	}
	dueDate, err := time.Parse("2006-01-02", req.DueDate)
	if err != nil {
		dueDate, _ = time.Parse("02/01/2006", req.DueDate)
	}
	status := models.InvoiceStatusPending
	if dueDate.Before(time.Now()) && req.TotalAmount > 0 {
		status = models.InvoiceStatusOverdue
	}
	inv := &models.Invoice{
		VendorID:        req.VendorID,
		ProjectID:       req.ProjectID,
		PurchaseRequestID: req.PurchaseRequestID,
		InvoiceNumber:   generateInvoiceNumber(),
		CreatedBy:       createdBy,
		TotalAmount:     req.TotalAmount,
		RemainingAmount: req.TotalAmount,
		IssueDate:       issueDate,
		DueDate:         dueDate,
		PaymentTerms:    req.PaymentTerms,
		Description:     req.Description,
		Status:          status,
	}
	if err := s.repo.Create(ctx, inv); err != nil {
		return nil, err
	}
	return s.repo.GetByID(ctx, inv.ID)
}

func (s *service) GetInvoice(ctx context.Context, id string) (*models.Invoice, error) {
	return s.repo.GetByIDWithPayments(ctx, id)
}

func (s *service) ListInvoices(ctx context.Context, search, status string, limit, offset int) (*ListInvoicesResponse, error) {
	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	totalAmt, paidAmt, pendingAmt, overdueAmt, err := s.repo.GetSummary(ctx)
	if err != nil {
		return nil, err
	}
	list, total, err := s.repo.List(ctx, search, status, limit, offset)
	if err != nil {
		return nil, err
	}
	// Ensure status is recomputed for display (overdue check)
	now := time.Now()
	for i := range list {
		if list[i].Status == models.InvoiceStatusPending || list[i].Status == models.InvoiceStatusPartiallyPaid {
			if list[i].DueDate.Before(now) && list[i].RemainingAmount > 0 {
				list[i].Status = models.InvoiceStatusOverdue
			}
		}
	}
	return &ListInvoicesResponse{
		Summary: InvoiceSummary{
			TotalAmount:   totalAmt,
			PaidAmount:    paidAmt,
			PendingAmount: pendingAmt,
			OverdueAmount: overdueAmt,
		},
		Invoices: list,
		Total:    total,
	}, nil
}

func (s *service) RecordPayment(ctx context.Context, invoiceID string, req RecordPaymentRequest) (*models.Payment, error) {
	inv, err := s.repo.GetByIDWithPayments(ctx, invoiceID)
	if err != nil || inv == nil {
		return nil, ErrInvoiceNotFound
	}
	if req.Amount <= 0 {
		return nil, ErrInvalidAmount
	}
	if req.Amount > inv.RemainingAmount {
		return nil, ErrPaymentExceedsDue
	}
	paymentDate, err := time.Parse("2006-01-02", req.PaymentDate)
	if err != nil {
		paymentDate, _ = time.Parse("02/01/2006", req.PaymentDate)
	}
	pm := models.PaymentMethod(req.PaymentMethod)
	if pm != models.PaymentMethodBankTransfer && pm != models.PaymentMethodCheque && pm != models.PaymentMethodCreditCard && pm != models.PaymentMethodCash && pm != models.PaymentMethodOther {
		pm = models.PaymentMethodOther
	}
	p := &models.Payment{
		InvoiceID:       invoiceID,
		Amount:          req.Amount,
		PaymentDate:     paymentDate,
		PaymentMethod:   pm,
		ReferenceNumber: req.ReferenceNumber,
	}
	if err := s.repo.CreatePayment(ctx, p); err != nil {
		return nil, err
	}
	inv.RemainingAmount -= req.Amount
	if inv.RemainingAmount <= 0 {
		inv.Status = models.InvoiceStatusPaid
	} else {
		inv.Status = models.InvoiceStatusPartiallyPaid
		if inv.DueDate.Before(time.Now()) {
			inv.Status = models.InvoiceStatusOverdue
		}
	}
	if err := s.repo.Update(ctx, inv); err != nil {
		return nil, err
	}
	return p, nil
}

func (s *service) GetSummary(ctx context.Context) (*InvoiceSummary, error) {
	total, paid, pending, overdue, err := s.repo.GetSummary(ctx)
	if err != nil {
		return nil, err
	}
	return &InvoiceSummary{
		TotalAmount:   total,
		PaidAmount:    paid,
		PendingAmount: pending,
		OverdueAmount: overdue,
	}, nil
}

func (s *service) ListInvoicesForPayment(ctx context.Context) ([]models.Invoice, error) {
	return s.repo.ListForPayment(ctx)
}
