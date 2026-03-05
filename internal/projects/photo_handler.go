package projects

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"erp-project/internal/models"
	"erp-project/pkg/utils"

	"github.com/gin-gonic/gin"
)

const (
	maxPhotoSize      = 10 << 20 // 10 MB
	allowedPhotoTypes = ".jpg,.jpeg,.png,.gif,.webp"
)

type PhotoHandler struct {
	repo       PhotoRepository
	projectRepo Repository
	uploadDir  string
}

func NewPhotoHandler(repo PhotoRepository, projectRepo Repository, uploadDir string) *PhotoHandler {
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	return &PhotoHandler{repo: repo, projectRepo: projectRepo, uploadDir: uploadDir}
}

func (h *PhotoHandler) allowedExt(name string) bool {
	ext := strings.ToLower(filepath.Ext(name))
	for _, e := range []string{".jpg", ".jpeg", ".png", ".gif", ".webp"} {
		if ext == e {
			return true
		}
	}
	return false
}

// UploadPhoto handles POST /api/v1/projects/:id/photos (multipart: file, optional milestone_id, caption)
func (h *PhotoHandler) UploadPhoto(c *gin.Context) {
	projectID := c.Param("id")
	if projectID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Project ID is required")
		return
	}

	// Verify project exists
	_, err := h.projectRepo.GetByID(c.Request.Context(), projectID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Project not found")
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "No file uploaded. Use form field 'file'.")
		return
	}
	if file.Size > maxPhotoSize {
		utils.ErrorResponse(c, http.StatusBadRequest, fmt.Sprintf("File too large. Max size is %d MB.", maxPhotoSize>>20))
		return
	}
	if !h.allowedExt(file.Filename) {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid file type. Allowed: "+allowedPhotoTypes)
		return
	}

	userID, _ := c.Get("userID")
	mid := c.PostForm("milestone_id")
	caption := c.PostForm("caption")

	// Save to disk: uploads/projects/{projectID}/{unique}{ext}
	ext := filepath.Ext(file.Filename)
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to generate filename")
		return
	}
	baseName := hex.EncodeToString(b) + ext
	relPath := filepath.Join("projects", projectID, baseName)
	absPath := filepath.Join(h.uploadDir, relPath)
	if err := os.MkdirAll(filepath.Dir(absPath), 0755); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create upload directory")
		return
	}
	if err := c.SaveUploadedFile(file, absPath); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to save file")
		return
	}

	photo := &models.SitePhoto{
		ProjectID:   projectID,
		MilestoneID: mid,
		UploadedBy:  userID.(string),
		FilePath:    relPath,
		Caption:     caption,
	}
	if err := h.repo.Create(c.Request.Context(), photo); err != nil {
		_ = os.Remove(absPath)
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to save photo record")
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Photo uploaded successfully", photo)
}

// ListPhotos handles GET /api/v1/projects/:id/photos
func (h *PhotoHandler) ListPhotos(c *gin.Context) {
	projectID := c.Param("id")
	milestoneID := c.Query("milestone_id")

	photos, err := h.repo.ListByProject(c.Request.Context(), projectID, milestoneID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to list photos")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Photos retrieved", photos)
}

// DeletePhoto handles DELETE /api/v1/projects/:id/photos/:photoId
func (h *PhotoHandler) DeletePhoto(c *gin.Context) {
	projectID := c.Param("id")
	photoID := c.Param("photoId")

	photo, err := h.repo.GetByID(c.Request.Context(), photoID)
	if err != nil || photo.ProjectID != projectID {
		utils.ErrorResponse(c, http.StatusNotFound, "Photo not found")
		return
	}

	absPath := filepath.Join(h.uploadDir, photo.FilePath)
	_ = os.Remove(absPath)

	if err := h.repo.Delete(c.Request.Context(), photoID); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete photo")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Photo deleted", nil)
}

// ServePhotoFile serves the actual image file. GET /api/v1/projects/:id/photos/:photoId/file
func (h *PhotoHandler) ServePhotoFile(c *gin.Context) {
	projectID := c.Param("id")
	photoID := c.Param("photoId")

	photo, err := h.repo.GetByID(c.Request.Context(), photoID)
	if err != nil || photo.ProjectID != projectID {
		c.Status(http.StatusNotFound)
		return
	}

	absPath := filepath.Join(h.uploadDir, photo.FilePath)
	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		c.Status(http.StatusNotFound)
		return
	}

	c.File(absPath)
}
