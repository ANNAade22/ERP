package projects

import (
	"net/http"
	"time"

	"erp-project/internal/models"

	"github.com/gin-gonic/gin"
)

type MilestoneHandler struct {
	service MilestoneService
}

func NewMilestoneHandler(service MilestoneService) *MilestoneHandler {
	return &MilestoneHandler{service: service}
}

// createMilestoneBody is the JSON body for create; ProjectID comes from URL path, Priority is optional.
type createMilestoneBody struct {
	Title        string                   `json:"title" binding:"required"`
	Description  string                   `json:"description"`
	DueDate      string                   `json:"due_date"`
	PlannedStart string                   `json:"planned_start"`
	PlannedEnd   string                   `json:"planned_end"`
	Priority     models.MilestonePriority `json:"priority"`
	Assignee     string                   `json:"assignee"`
	Progress     float64                  `json:"progress"`
	Status       models.MilestoneStatus   `json:"status"`
}

func (h *MilestoneHandler) CreateMilestone(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Project ID is required"})
		return
	}

	var body createMilestoneBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	parseDate := func(s string) *time.Time {
		if s == "" {
			return nil
		}
		t, err := time.Parse("2006-01-02", s)
		if err != nil {
			return nil
		}
		return &t
	}

	dueDate := parseDate(body.DueDate)
	plannedStart := parseDate(body.PlannedStart)
	plannedEnd := parseDate(body.PlannedEnd)
	if dueDate == nil && plannedEnd != nil {
		dueDate = plannedEnd
	}
	if dueDate == nil && plannedStart != nil {
		dueDate = plannedStart
	}

	priority := body.Priority
	if priority == "" {
		priority = models.MilestonePriorityMedium
	}

	milestone := &models.Milestone{
		ProjectID:    projectID,
		Title:        body.Title,
		Description:  body.Description,
		DueDate:      dueDate,
		PlannedStart: plannedStart,
		PlannedEnd:   plannedEnd,
		Priority:     priority,
		Assignee:     body.Assignee,
		Progress:     body.Progress,
		Status:       body.Status,
	}

	if milestone.Status == "" {
		milestone.Status = models.MilestoneStatusUpcoming
	}

	if milestone.Progress < 0 {
		milestone.Progress = 0
	}
	if milestone.Progress > 100 {
		milestone.Progress = 100
	}

	if err := h.service.CreateMilestone(c.Request.Context(), milestone); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create milestone"})
		return
	}

	c.JSON(http.StatusCreated, milestone)
}

func (h *MilestoneHandler) GetProjectMilestones(c *gin.Context) {
	projectID := c.Param("id")

	milestones, err := h.service.GetProjectMilestones(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch milestones"})
		return
	}

	c.JSON(http.StatusOK, milestones)
}

func (h *MilestoneHandler) GetMilestone(c *gin.Context) {
	id := c.Param("id")

	milestone, err := h.service.GetMilestone(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Milestone not found"})
		return
	}

	c.JSON(http.StatusOK, milestone)
}

type UpdateMilestoneAPIRequest struct {
	Title        *string                   `json:"title"`
	Description  *string                   `json:"description"`
	DueDate      *string                   `json:"due_date"`
	PlannedStart *string                   `json:"planned_start"`
	PlannedEnd   *string                   `json:"planned_end"`
	Priority     *models.MilestonePriority `json:"priority"`
	Assignee     *string                   `json:"assignee"`
	Progress     *float64                  `json:"progress"`
	Status       *models.MilestoneStatus   `json:"status"`
}

func (h *MilestoneHandler) UpdateMilestone(c *gin.Context) {
	id := c.Param("id")
	var req UpdateMilestoneAPIRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// First fetch
	milestone, err := h.service.GetMilestone(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Milestone not found"})
		return
	}

	if req.Title != nil {
		milestone.Title = *req.Title
	}
	if req.Description != nil {
		milestone.Description = *req.Description
	}
	if req.DueDate != nil {
		if *req.DueDate == "" {
			milestone.DueDate = nil
		} else {
			parsedDate, err := time.Parse("2006-01-02", *req.DueDate)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, use YYYY-MM-DD"})
				return
			}
			milestone.DueDate = &parsedDate
		}
	}
	if req.PlannedStart != nil {
		if *req.PlannedStart == "" {
			milestone.PlannedStart = nil
		} else {
			t, err := time.Parse("2006-01-02", *req.PlannedStart)
			if err == nil {
				milestone.PlannedStart = &t
			}
		}
	}
	if req.PlannedEnd != nil {
		if *req.PlannedEnd == "" {
			milestone.PlannedEnd = nil
		} else {
			t, err := time.Parse("2006-01-02", *req.PlannedEnd)
			if err == nil {
				milestone.PlannedEnd = &t
			}
		}
	}
	if req.Priority != nil {
		milestone.Priority = *req.Priority
	}
	if req.Assignee != nil {
		milestone.Assignee = *req.Assignee
	}
	if req.Progress != nil {
		milestone.Progress = *req.Progress
	}
	if req.Status != nil {
		milestone.Status = *req.Status
	}

	if err := h.service.UpdateMilestone(c.Request.Context(), milestone); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update milestone"})
		return
	}

	c.JSON(http.StatusOK, milestone)
}

func (h *MilestoneHandler) DeleteMilestone(c *gin.Context) {
	id := c.Param("id")
	if err := h.service.DeleteMilestone(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete milestone"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Milestone deleted successfully"})
}

func (h *MilestoneHandler) GetDashboardStats(c *gin.Context) {
	stats, err := h.service.GetDashboardStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}
