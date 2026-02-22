package procurement

import (
	"errors"
	"net/http"

	"erp-project/pkg/utils"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

// --- Vendor endpoints ---

// CreateVendor handles POST /api/v1/vendors
func (h *Handler) CreateVendor(c *gin.Context) {
	var req CreateVendorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	vendor, err := h.service.CreateVendor(c.Request.Context(), req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create vendor")
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Vendor created successfully", vendor)
}

// GetAllVendors handles GET /api/v1/vendors
func (h *Handler) GetAllVendors(c *gin.Context) {
	vendors, err := h.service.GetAllVendors(c.Request.Context())
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve vendors")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Vendors retrieved successfully", vendors)
}

// GetVendor handles GET /api/v1/vendors/:id
func (h *Handler) GetVendor(c *gin.Context) {
	id := c.Param("id")

	vendor, err := h.service.GetVendorByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, ErrVendorNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Vendor not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve vendor")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Vendor retrieved successfully", vendor)
}

// UpdateVendor handles PUT /api/v1/vendors/:id
func (h *Handler) UpdateVendor(c *gin.Context) {
	id := c.Param("id")

	var req UpdateVendorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	vendor, err := h.service.UpdateVendor(c.Request.Context(), id, req)
	if err != nil {
		if errors.Is(err, ErrVendorNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Vendor not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update vendor")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Vendor updated successfully", vendor)
}

// --- Purchase Request endpoints ---

// CreatePurchaseRequest handles POST /api/v1/procurement/requests
func (h *Handler) CreatePurchaseRequest(c *gin.Context) {
	var req CreatePurchaseRequestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	userID, _ := c.Get("userID")

	pr, err := h.service.CreatePurchaseRequest(c.Request.Context(), req, userID.(string))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Purchase request created successfully", pr)
}

// GetPurchaseRequest handles GET /api/v1/procurement/requests/:id
func (h *Handler) GetPurchaseRequest(c *gin.Context) {
	id := c.Param("id")

	pr, err := h.service.GetPurchaseRequestByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, ErrPurchaseRequestNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Purchase request not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve purchase request")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Purchase request retrieved", pr)
}

// GetPurchaseRequestsByProject handles GET /api/v1/procurement/requests?project_id=...
func (h *Handler) GetPurchaseRequestsByProject(c *gin.Context) {
	projectID := c.Query("project_id")
	if projectID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "project_id query param is required")
		return
	}

	prs, err := h.service.GetPurchaseRequestsByProject(c.Request.Context(), projectID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve purchase requests")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Purchase requests retrieved", prs)
}

// GetPendingRequests handles GET /api/v1/procurement/requests/pending
func (h *Handler) GetPendingRequests(c *gin.Context) {
	prs, err := h.service.GetPendingPurchaseRequests(c.Request.Context())
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve pending requests")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Pending requests retrieved", prs)
}

// UpdatePurchaseRequestStatus handles PATCH /api/v1/procurement/requests/:id/status
func (h *Handler) UpdatePurchaseRequestStatus(c *gin.Context) {
	id := c.Param("id")

	var req UpdatePurchaseRequestStatusDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	userID, _ := c.Get("userID")

	pr, err := h.service.UpdatePurchaseRequestStatus(c.Request.Context(), id, req, userID.(string))
	if err != nil {
		if errors.Is(err, ErrPurchaseRequestNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Purchase request not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Purchase request status updated", pr)
}
