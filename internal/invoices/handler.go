package invoices

import (
	"errors"
	"net/http"
	"strconv"

	"erp-project/pkg/utils"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service    Service
	uploadDir  string
}

func NewHandler(service Service, uploadDir string) *Handler {
	return &Handler{service: service, uploadDir: uploadDir}
}

// ListInvoices handles GET /api/v1/invoices
func (h *Handler) ListInvoices(c *gin.Context) {
	search := c.Query("search")
	status := c.Query("status")
	if status == "" {
		status = "all"
	}
	limit := 50
	if q := c.Query("limit"); q != "" {
		if parsed, err := strconv.Atoi(q); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	offset := 0
	if q := c.Query("offset"); q != "" {
		if parsed, err := strconv.Atoi(q); err == nil && parsed >= 0 {
			offset = parsed
		}
	}
	res, err := h.service.ListInvoices(c.Request.Context(), search, status, limit, offset)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to list invoices")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Invoices retrieved", res)
}

// GetInvoice handles GET /api/v1/invoices/:id
func (h *Handler) GetInvoice(c *gin.Context) {
	id := c.Param("id")
	inv, err := h.service.GetInvoice(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, ErrInvoiceNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Invoice not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve invoice")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Invoice retrieved", inv)
}

// CreateInvoice handles POST /api/v1/invoices
func (h *Handler) CreateInvoice(c *gin.Context) {
	var req CreateInvoiceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}
	userID, _ := c.Get("userID")
	createdBy := ""
	if id, ok := userID.(string); ok {
		createdBy = id
	}
	inv, err := h.service.CreateInvoice(c.Request.Context(), req, createdBy)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusCreated, "Invoice created successfully", inv)
}

// RecordPayment handles POST /api/v1/invoices/:id/payments
func (h *Handler) RecordPayment(c *gin.Context) {
	id := c.Param("id")
	var req RecordPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}
	p, err := h.service.RecordPayment(c.Request.Context(), id, req)
	if err != nil {
		if errors.Is(err, ErrInvoiceNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Invoice not found")
			return
		}
		if errors.Is(err, ErrPaymentExceedsDue) {
			utils.ErrorResponse(c, http.StatusBadRequest, "Payment amount exceeds remaining amount")
			return
		}
		if errors.Is(err, ErrInvalidAmount) {
			utils.ErrorResponse(c, http.StatusBadRequest, "Payment amount must be positive")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusCreated, "Payment recorded successfully", p)
}

// GetInvoicesForPayment handles GET /api/v1/invoices/for-payment (unpaid invoices for dropdown)
func (h *Handler) GetInvoicesForPayment(c *gin.Context) {
	list, err := h.service.ListInvoicesForPayment(c.Request.Context())
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to list invoices")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Invoices for payment retrieved", list)
}

// DownloadInvoice handles GET /api/v1/invoices/:id/download - returns PDF
func (h *Handler) DownloadInvoice(c *gin.Context) {
	id := c.Param("id")
	inv, err := h.service.GetInvoice(c.Request.Context(), id)
	if err != nil || inv == nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Invoice not found")
		return
	}
	pdfBytes, err := GeneratePDF(inv, h.uploadDir)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate PDF")
		return
	}
	filename := "invoice-" + inv.InvoiceNumber + ".pdf"
	c.Header("Content-Disposition", "attachment; filename=\""+filename+"\"")
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}
