package attendance

import (
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

// --- Worker endpoints ---

// CreateWorker handles POST /api/v1/workers
func (h *Handler) CreateWorker(c *gin.Context) {
	var req CreateWorkerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	worker, err := h.service.CreateWorker(c.Request.Context(), req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create worker")
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Worker created successfully", worker)
}

// GetWorkersByProject handles GET /api/v1/projects/:id/workers
func (h *Handler) GetWorkersByProject(c *gin.Context) {
	projectID := c.Param("id")

	workers, err := h.service.GetWorkersByProject(c.Request.Context(), projectID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve workers")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Workers retrieved successfully", workers)
}

// --- Attendance endpoints ---

// MarkAttendance handles POST /api/v1/attendance
func (h *Handler) MarkAttendance(c *gin.Context) {
	var req MarkAttendanceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	markedBy, _ := c.Get("userID")

	record, err := h.service.MarkAttendance(c.Request.Context(), req, markedBy.(string))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Attendance marked successfully", record)
}

// CheckOut handles PATCH /api/v1/attendance/:id/checkout
func (h *Handler) CheckOut(c *gin.Context) {
	id := c.Param("id")

	var req CheckOutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	err := h.service.CheckOut(c.Request.Context(), id, req)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Check-out recorded successfully", nil)
}

// GetAttendanceByDate handles GET /api/v1/attendance?project_id=...&date=...
func (h *Handler) GetAttendanceByDate(c *gin.Context) {
	projectID := c.Query("project_id")
	date := c.Query("date")

	if projectID == "" || date == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "project_id and date query params are required")
		return
	}

	records, err := h.service.GetAttendanceByDate(c.Request.Context(), projectID, date)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Attendance records retrieved", records)
}

// GetAttendanceByWorker handles GET /api/v1/attendance/worker/:workerId?from=...&to=...
func (h *Handler) GetAttendanceByWorker(c *gin.Context) {
	workerID := c.Param("workerId")
	from := c.Query("from")
	to := c.Query("to")

	if from == "" || to == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "from and to query params are required (YYYY-MM-DD)")
		return
	}

	records, err := h.service.GetAttendanceByWorker(c.Request.Context(), workerID, from, to)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Worker attendance retrieved", records)
}
