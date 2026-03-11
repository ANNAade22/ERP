package equipment

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

func (h *Handler) GetDashboard(c *gin.Context) {
	res, err := h.service.GetDashboard(c.Request.Context())
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Dashboard data retrieved", res)
}

func (h *Handler) ListScheduled(c *gin.Context) {
	list, err := h.service.ListScheduled(c.Request.Context())
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Scheduled equipment retrieved", list)
}

func (h *Handler) CreateSchedule(c *gin.Context) {
	var req CreateScheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}
	sch, err := h.service.CreateSchedule(c.Request.Context(), req)
	if err != nil {
		if errors.Is(err, ErrEquipmentNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Equipment not found")
			return
		}
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusCreated, "Schedule created", sch)
}

func (h *Handler) UpdateSchedule(c *gin.Context) {
	id := c.Param("id")
	var req UpdateScheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}
	sch, err := h.service.UpdateSchedule(c.Request.Context(), id, req)
	if err != nil {
		if errors.Is(err, ErrScheduleNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Schedule not found")
			return
		}
		if errors.Is(err, ErrEquipmentNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Equipment not found")
			return
		}
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Schedule updated", sch)
}

func (h *Handler) DeleteSchedule(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.DeleteSchedule(c.Request.Context(), id); err != nil {
		if errors.Is(err, ErrScheduleNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Schedule not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Schedule deleted", nil)
}

func (h *Handler) ListEquipment(c *gin.Context) {
	status := c.Query("status")
	projectID := c.Query("project_id")
	list, err := h.service.ListEquipment(c.Request.Context(), status, projectID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Equipment list retrieved", list)
}

func (h *Handler) CreateEquipment(c *gin.Context) {
	var req CreateEquipmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}
	eq, err := h.service.CreateEquipment(c.Request.Context(), req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusCreated, "Equipment created", eq)
}

func (h *Handler) GetEquipment(c *gin.Context) {
	id := c.Param("id")
	eq, err := h.service.GetEquipmentByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, ErrEquipmentNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Equipment not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Equipment retrieved", eq)
}

func (h *Handler) UpdateEquipment(c *gin.Context) {
	id := c.Param("id")
	var req UpdateEquipmentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}
	eq, err := h.service.UpdateEquipment(c.Request.Context(), id, req)
	if err != nil {
		if errors.Is(err, ErrEquipmentNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Equipment not found")
			return
		}
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Equipment updated", eq)
}

func (h *Handler) DeleteEquipment(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.DeleteEquipment(c.Request.Context(), id); err != nil {
		if errors.Is(err, ErrEquipmentNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Equipment not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Equipment deleted", nil)
}

func (h *Handler) ListMaintenance(c *gin.Context) {
	equipmentID := c.Param("id")
	list, err := h.service.ListMaintenanceByEquipment(c.Request.Context(), equipmentID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Maintenance list retrieved", list)
}

func (h *Handler) CreateMaintenance(c *gin.Context) {
	equipmentID := c.Param("id")
	var req CreateMaintenanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}
	m, err := h.service.CreateMaintenance(c.Request.Context(), equipmentID, req)
	if err != nil {
		if errors.Is(err, ErrEquipmentNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Equipment not found")
			return
		}
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusCreated, "Maintenance task created", m)
}

func (h *Handler) UpdateMaintenance(c *gin.Context) {
	id := c.Param("id")
	var req UpdateMaintenanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}
	m, err := h.service.UpdateMaintenance(c.Request.Context(), id, req)
	if err != nil {
		if errors.Is(err, ErrMaintenanceNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Maintenance task not found")
			return
		}
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Maintenance updated", m)
}

func (h *Handler) DeleteMaintenance(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.DeleteMaintenance(c.Request.Context(), id); err != nil {
		if errors.Is(err, ErrMaintenanceNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Maintenance task not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Maintenance deleted", nil)
}
