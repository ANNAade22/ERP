package projects

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

// CreateProject handles POST /api/v1/projects
func (h *Handler) CreateProject(c *gin.Context) {
	var req CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	userID, _ := c.Get("userID")

	project, err := h.service.CreateProject(c.Request.Context(), req, userID.(string))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create project")
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Project created successfully", project)
}

// GetProject handles GET /api/v1/projects/:id
func (h *Handler) GetProject(c *gin.Context) {
	id := c.Param("id")

	project, err := h.service.GetProjectByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, ErrProjectNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Project not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve project")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Project retrieved successfully", project)
}

// GetAllProjects handles GET /api/v1/projects
func (h *Handler) GetAllProjects(c *gin.Context) {
	projects, err := h.service.GetAllProjects(c.Request.Context())
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve projects")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Projects retrieved successfully", projects)
}

// UpdateProject handles PUT /api/v1/projects/:id
func (h *Handler) UpdateProject(c *gin.Context) {
	id := c.Param("id")

	var req UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	project, err := h.service.UpdateProject(c.Request.Context(), id, req)
	if err != nil {
		if errors.Is(err, ErrProjectNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Project not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update project")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Project updated successfully", project)
}

// DeleteProject handles DELETE /api/v1/projects/:id
func (h *Handler) DeleteProject(c *gin.Context) {
	id := c.Param("id")

	err := h.service.DeleteProject(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, ErrProjectNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Project not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete project")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Project deleted successfully", nil)
}
