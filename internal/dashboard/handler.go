package dashboard

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

// GetDashboard handles GET /api/v1/dashboard
// Returns an aggregated overview of all projects
func (h *Handler) GetDashboard(c *gin.Context) {
	projectID := c.Query("project_id")

	var dashboard *DashboardResponse
	var err error

	if projectID != "" {
		dashboard, err = h.service.GetProjectDashboard(c.Request.Context(), projectID)
	} else {
		dashboard, err = h.service.GetDashboard(c.Request.Context())
	}

	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve dashboard data")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Dashboard retrieved successfully", dashboard)
}
