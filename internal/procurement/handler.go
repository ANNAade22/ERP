package procurement

import (
	"errors"
	"net/http"
	"strconv"

	"erp-project/internal/models"
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

// GetAllVendors handles GET /api/v1/vendors?include_inactive=true&q=...
func (h *Handler) GetAllVendors(c *gin.Context) {
	includeInactive := c.Query("include_inactive") == "true" || c.Query("include_inactive") == "1"
	searchQ := c.Query("q")
	vendors, err := h.service.GetAllVendors(c.Request.Context(), includeInactive, searchQ)
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

// DeleteVendor handles DELETE /api/v1/vendors/:id
func (h *Handler) DeleteVendor(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Vendor ID is required")
		return
	}
	if err := h.service.DeleteVendor(c.Request.Context(), id); err != nil {
		if errors.Is(err, ErrVendorNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Vendor not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete vendor")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Vendor deleted successfully", nil)
}

// GetVendorsByProject handles GET /api/v1/projects/:id/vendors
func (h *Handler) GetVendorsByProject(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Project ID is required")
		return
	}
	vendors, err := h.service.GetVendorsByProject(c.Request.Context(), projectID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve project vendors")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Project vendors retrieved", vendors)
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
		if errors.Is(err, ErrItemsRequired) {
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}
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

// GetAllPurchaseRequests handles GET /api/v1/procurement/requests/all?...filters
func (h *Handler) GetAllPurchaseRequests(c *gin.Context) {
	userIDRaw, _ := c.Get("userID")
	userRoleRaw, _ := c.Get("userRole")
	userID := userIDRaw.(string)
	userRole := models.Role(userRoleRaw.(string))

	filter := PurchaseRequestListFilter{
		ProjectID: c.Query("project_id"),
		Status:    c.Query("status"),
		Search:    c.Query("search"),
		From:      c.Query("from"),
		To:        c.Query("to"),
	}

	prs, err := h.service.GetPurchaseRequests(c.Request.Context(), filter, userID, userRole)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Purchase requests retrieved", prs)
}

const maxRecentOrdersLimit = 100

// GetRecentOrders handles GET /api/v1/procurement/orders/recent?limit=...
func (h *Handler) GetRecentOrders(c *gin.Context) {
	limit := 10
	if q := c.Query("limit"); q != "" {
		parsed, err := strconv.Atoi(q)
		if err == nil && parsed > 0 {
			limit = parsed
			if limit > maxRecentOrdersLimit {
				limit = maxRecentOrdersLimit
			}
		}
	}

	orders, err := h.service.GetRecentOrders(c.Request.Context(), limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve recent orders")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Recent orders retrieved", orders)
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

// UpdatePurchaseRequest handles PATCH /api/v1/procurement/requests/:id
func (h *Handler) UpdatePurchaseRequest(c *gin.Context) {
	id := c.Param("id")

	var req UpdatePurchaseRequestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	pr, err := h.service.UpdatePurchaseRequest(c.Request.Context(), id, req)
	if err != nil {
		if errors.Is(err, ErrPurchaseRequestNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Purchase request not found")
			return
		}
		if errors.Is(err, ErrEditNotAllowed) {
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update purchase request")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Purchase request updated", pr)
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
	userRole, _ := c.Get("userRole")

	pr, err := h.service.UpdatePurchaseRequestStatus(
		c.Request.Context(),
		id,
		req,
		userID.(string),
		models.Role(userRole.(string)),
	)
	if err != nil {
		if errors.Is(err, ErrPurchaseRequestNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Purchase request not found")
			return
		}
		if errors.Is(err, ErrStatusActionForbidden) || errors.Is(err, ErrInvalidTransition) {
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Purchase request status updated", pr)
}
