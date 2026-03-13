package invoices

import (
	"context"
	"time"

	"erp-project/internal/models"

	"gorm.io/gorm"
)

type Repository interface {
	Create(ctx context.Context, inv *models.Invoice) error
	CreatePayment(ctx context.Context, p *models.Payment) error
	GetByID(ctx context.Context, id string) (*models.Invoice, error)
	GetByIDWithPayments(ctx context.Context, id string) (*models.Invoice, error)
	List(ctx context.Context, search, status string, limit, offset int) ([]models.Invoice, int64, error)
	Update(ctx context.Context, inv *models.Invoice) error
	GetSummary(ctx context.Context) (totalAmount, paidAmount, pendingAmount, overdueAmount float64, err error)
	ListForPayment(ctx context.Context) ([]models.Invoice, error)
}

type repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
	return &repository{db: db}
}

func (r *repository) Create(ctx context.Context, inv *models.Invoice) error {
	return r.db.WithContext(ctx).Create(inv).Error
}

func (r *repository) CreatePayment(ctx context.Context, p *models.Payment) error {
	return r.db.WithContext(ctx).Create(p).Error
}

func (r *repository) GetByID(ctx context.Context, id string) (*models.Invoice, error) {
	var inv models.Invoice
	err := r.db.WithContext(ctx).
		Preload("Vendor").Preload("Project").
		Where("id = ?", id).
		First(&inv).Error
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

func (r *repository) GetByIDWithPayments(ctx context.Context, id string) (*models.Invoice, error) {
	var inv models.Invoice
	err := r.db.WithContext(ctx).
		Preload("Vendor").Preload("Project").Preload("Payments").Preload("Creator").
		Preload("PurchaseRequest").Preload("PurchaseRequest.Items.Material").Preload("PurchaseRequest.Requester").
		Where("id = ?", id).
		First(&inv).Error
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

func (r *repository) List(ctx context.Context, search, status string, limit, offset int) ([]models.Invoice, int64, error) {
	q := r.db.WithContext(ctx).Model(&models.Invoice{}).Preload("Vendor").Preload("Project")
	if search != "" {
		pat := "%" + search + "%"
		q = q.Joins("LEFT JOIN vendors ON vendors.id = invoices.vendor_id AND vendors.deleted_at IS NULL").
			Joins("LEFT JOIN projects ON projects.id = invoices.project_id AND projects.deleted_at IS NULL").
			Where("invoices.invoice_number ILIKE ? OR vendors.name ILIKE ? OR projects.name ILIKE ?", pat, pat, pat)
	}
	if status != "" && status != "all" {
		q = q.Where("status = ?", models.InvoiceStatus(status))
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var list []models.Invoice
	err := q.Order("created_at DESC").Limit(limit).Offset(offset).Find(&list).Error
	return list, total, err
}

func (r *repository) Update(ctx context.Context, inv *models.Invoice) error {
	return r.db.WithContext(ctx).Save(inv).Error
}

func (r *repository) GetSummary(ctx context.Context) (totalAmount, paidAmount, pendingAmount, overdueAmount float64, err error) {
	var res struct {
		Total   float64
		Paid    float64
		Pending float64
		Overdue float64
	}
	err = r.db.WithContext(ctx).Model(&models.Invoice{}).
		Select("COALESCE(SUM(total_amount), 0) as total").
		Scan(&res).Error
	if err != nil {
		return 0, 0, 0, 0, err
	}
	totalAmount = res.Total

	err = r.db.WithContext(ctx).Model(&models.Invoice{}).
		Where("status = ?", models.InvoiceStatusPaid).
		Select("COALESCE(SUM(total_amount), 0) as paid").
		Scan(&res).Error
	if err != nil {
		return 0, 0, 0, 0, err
	}
	paidAmount = res.Paid

	err = r.db.WithContext(ctx).Model(&models.Invoice{}).
		Where("status IN ?", []models.InvoiceStatus{models.InvoiceStatusPending, models.InvoiceStatusPartiallyPaid}).
		Where("due_date >= ?", time.Now().Format("2006-01-02")).
		Select("COALESCE(SUM(remaining_amount), 0) as pending").
		Scan(&res).Error
	if err != nil {
		return 0, 0, 0, 0, err
	}
	pendingAmount = res.Pending

	err = r.db.WithContext(ctx).Model(&models.Invoice{}).
		Where("status IN ?", []models.InvoiceStatus{models.InvoiceStatusPending, models.InvoiceStatusPartiallyPaid, models.InvoiceStatusOverdue}).
		Where("due_date < ?", time.Now().Format("2006-01-02")).
		Where("remaining_amount > 0").
		Select("COALESCE(SUM(remaining_amount), 0) as overdue").
		Scan(&res).Error
	if err != nil {
		return 0, 0, 0, 0, err
	}
	overdueAmount = res.Overdue
	return totalAmount, paidAmount, pendingAmount, overdueAmount, nil
}

func (r *repository) ListForPayment(ctx context.Context) ([]models.Invoice, error) {
	var list []models.Invoice
	err := r.db.WithContext(ctx).
		Preload("Vendor").Preload("Project").
		Where("remaining_amount > 0").
		Where("status IN ?", []models.InvoiceStatus{models.InvoiceStatusPending, models.InvoiceStatusPartiallyPaid, models.InvoiceStatusOverdue}).
		Order("due_date ASC").
		Find(&list).Error
	return list, err
}
