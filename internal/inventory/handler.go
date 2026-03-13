package inventory

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

// CreateMaterial handles POST /api/v1/inventory/materials
func (h *Handler) CreateMaterial(c *gin.Context) {
	var req CreateMaterialRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	material, err := h.service.CreateMaterial(c.Request.Context(), req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create material")
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Material created successfully", material)
}

// GetMaterialsByProject handles GET /api/v1/inventory/materials?project_id=...
func (h *Handler) GetMaterialsByProject(c *gin.Context) {
	projectID := c.Query("project_id")
	if projectID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "project_id query param is required")
		return
	}

	materials, err := h.service.GetMaterialsByProject(c.Request.Context(), projectID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve materials")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Materials retrieved successfully", materials)
}

// DeleteMaterial handles DELETE /api/v1/inventory/materials/:id
func (h *Handler) DeleteMaterial(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.DeleteMaterial(c.Request.Context(), id); err != nil {
		if errors.Is(err, ErrMaterialNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Material not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete material")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Material deleted successfully", nil)
}

// GetMaterial handles GET /api/v1/inventory/materials/:id
func (h *Handler) GetMaterial(c *gin.Context) {
	id := c.Param("id")

	material, err := h.service.GetMaterialByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, ErrMaterialNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Material not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve material")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Material retrieved successfully", material)
}

// StockIn handles POST /api/v1/inventory/stock-in
func (h *Handler) StockIn(c *gin.Context) {
	var req StockInRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	userID, _ := c.Get("userID")

	movement, err := h.service.StockIn(c.Request.Context(), req, userID.(string))
	if err != nil {
		if errors.Is(err, ErrMaterialNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Material not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Stock added successfully", movement)
}

// StockOut handles POST /api/v1/inventory/stock-out
func (h *Handler) StockOut(c *gin.Context) {
	var req StockOutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	userID, _ := c.Get("userID")

	movement, err := h.service.StockOut(c.Request.Context(), req, userID.(string))
	if err != nil {
		if errors.Is(err, ErrMaterialNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Material not found")
			return
		}
		if errors.Is(err, ErrInsufficientStock) {
			utils.ErrorResponse(c, http.StatusBadRequest, "Insufficient stock for this operation")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Stock removed successfully", movement)
}

// GetStockMovements handles GET /api/v1/inventory/movements/:materialId
func (h *Handler) GetStockMovements(c *gin.Context) {
	materialID := c.Param("materialId")

	movements, err := h.service.GetStockMovements(c.Request.Context(), materialID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve stock movements")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Stock movements retrieved", movements)
}

// GetLowStockAlerts handles GET /api/v1/inventory/low-stock?project_id=...
func (h *Handler) GetLowStockAlerts(c *gin.Context) {
	projectID := c.Query("project_id")
	if projectID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "project_id query param is required")
		return
	}

	materials, err := h.service.GetLowStockAlerts(c.Request.Context(), projectID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve low stock alerts")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Low stock materials", materials)
}
