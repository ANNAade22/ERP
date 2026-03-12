package users

import (
	"errors"
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
	maxAvatarSize      = 2 << 20  // 2 MB
	allowedAvatarTypes = ".jpg,.jpeg,.png,.gif,.webp"
)

type Handler struct {
	service   Service
	uploadDir string
}

func NewHandler(service Service, uploadDir string) *Handler {
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	return &Handler{service: service, uploadDir: uploadDir}
}

func (h *Handler) allowedAvatarExt(name string) bool {
	ext := strings.ToLower(filepath.Ext(name))
	for _, e := range []string{".jpg", ".jpeg", ".png", ".gif", ".webp"} {
		if ext == e {
			return true
		}
	}
	return false
}

// ListUsers returns all users (admin only). Query: role= to filter by role.
func (h *Handler) ListUsers(c *gin.Context) {
	roleFilter := c.Query("role")
	users, err := h.service.ListUsers(c.Request.Context(), roleFilter, nil)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to list users")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Users retrieved successfully", users)
}

// AssignableUser is a minimal user for assignment dropdowns (e.g. maintenance assignee).
type AssignableUser struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// ListAssignableUsers returns id and name for active users only (admin and project manager only).
func (h *Handler) ListAssignableUsers(c *gin.Context) {
	activeOnly := true
	users, err := h.service.ListUsers(c.Request.Context(), "", &activeOnly)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to list users")
		return
	}
	out := make([]AssignableUser, len(users))
	for i := range users {
		out[i] = AssignableUser{ID: users[i].ID, Name: users[i].Name}
	}
	utils.SuccessResponse(c, http.StatusOK, "Assignable users retrieved", out)
}

type UpdateUserRoleRequest struct {
	Role models.Role `json:"role" binding:"required"`
}

type ResetPasswordRequest struct {
	Password string `json:"password" binding:"required,min=6"`
}

type SetUserActiveRequest struct {
	Active *bool `json:"active" binding:"required"`
}

// UpdateUserRole updates one user's role (admin only).
func (h *Handler) UpdateUserRole(c *gin.Context) {
	id := c.Param("id")
	var req UpdateUserRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}
	user, err := h.service.UpdateUserRole(c.Request.Context(), id, req.Role)
	if err != nil {
		if errors.Is(err, ErrInvalidRole) {
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, ErrUserNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "User not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update user role")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "User role updated successfully", user)
}

// ResetUserPassword resets one user's password (admin only).
func (h *Handler) ResetUserPassword(c *gin.Context) {
	id := c.Param("id")
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}
	user, err := h.service.ResetUserPassword(c.Request.Context(), id, req.Password)
	if err != nil {
		if errors.Is(err, ErrWeakPassword) {
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, ErrUserNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "User not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to reset password")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "User password reset successfully", user)
}

// SetUserActive sets a user's active status (admin only). Inactive users cannot log in.
func (h *Handler) SetUserActive(c *gin.Context) {
	id := c.Param("id")
	actorID, _ := c.Get("userID")
	var req SetUserActiveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}
	if req.Active == nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "active field is required")
		return
	}
	user, err := h.service.SetUserActive(c.Request.Context(), id, *req.Active, actorID.(string))
	if err != nil {
		if errors.Is(err, ErrCannotDeactivateSelf) {
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, ErrUserNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "User not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update user status")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "User status updated successfully", user)
}

// DeleteUser soft-deletes one user (admin only).
func (h *Handler) DeleteUser(c *gin.Context) {
	id := c.Param("id")
	actorID, _ := c.Get("userID")
	err := h.service.DeleteUser(c.Request.Context(), id, actorID.(string))
	if err != nil {
		if errors.Is(err, ErrCannotDeleteSelf) {
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, ErrUserNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "User not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete user")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "User deleted successfully", nil)
}

// GetProfile returns the profile of the currently authenticated user
func (h *Handler) GetProfile(c *gin.Context) {
	// The auth middleware should set the user ID in the context
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	user, err := h.service.GetUserByID(c.Request.Context(), userID.(string))
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "User not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve user profile")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Profile retrieved successfully", user)
}

type UpdateProfileRequest struct {
	Name  string `json:"name" binding:"required"`
	Email string `json:"email" binding:"required,email"`
	Phone string `json:"phone"`
}

// UpdateProfile updates the current user's profile (name, email, phone).
func (h *Handler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	user, err := h.service.UpdateProfile(c.Request.Context(), userID.(string), req.Name, req.Email, req.Phone)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "User not found")
			return
		}
		if errors.Is(err, ErrUserAlreadyExists) {
			utils.ErrorResponse(c, http.StatusConflict, "A user with this email already exists")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update profile")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Profile updated successfully", user)
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=6"`
}

// ChangePassword allows the current user to change their own password.
func (h *Handler) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	err := h.service.ChangeOwnPassword(c.Request.Context(), userID.(string), req.CurrentPassword, req.NewPassword)
	if err != nil {
		if errors.Is(err, ErrWrongCurrentPassword) {
			utils.ErrorResponse(c, http.StatusBadRequest, "Current password is incorrect")
			return
		}
		if errors.Is(err, ErrWeakPassword) {
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, ErrUserNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "User not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to change password")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Password changed successfully", nil)
}

// UploadProfileAvatar handles POST /profile/avatar (multipart form field "file").
func (h *Handler) UploadProfileAvatar(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized")
		return
	}
	uid := userID.(string)

	file, err := c.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "No file uploaded. Use form field 'file'.")
		return
	}
	if file.Size > maxAvatarSize {
		utils.ErrorResponse(c, http.StatusBadRequest, fmt.Sprintf("File too large. Max size is %d MB.", maxAvatarSize>>20))
		return
	}
	if !h.allowedAvatarExt(file.Filename) {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid file type. Allowed: "+allowedAvatarTypes)
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext == ".jpeg" {
		ext = ".jpg"
	}
	relPath := filepath.Join("avatars", uid+ext)
	absPath := filepath.Join(h.uploadDir, relPath)
	if err := os.MkdirAll(filepath.Dir(absPath), 0755); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create upload directory")
		return
	}
	if err := c.SaveUploadedFile(file, absPath); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to save file")
		return
	}

	user, err := h.service.UpdateProfileAvatar(c.Request.Context(), uid, relPath)
	if err != nil {
		_ = os.Remove(absPath)
		if errors.Is(err, ErrUserNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "User not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update profile avatar")
		return
	}

	c.Header("Cache-Control", "private, max-age=86400")
	utils.SuccessResponse(c, http.StatusOK, "Profile picture updated successfully", user)
}

// UploadUserAvatar handles POST /users/:id/avatar (admin only). Same as UploadProfileAvatar but for any user by ID.
func (h *Handler) UploadUserAvatar(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "User ID is required")
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "No file uploaded. Use form field 'file'.")
		return
	}
	if file.Size > maxAvatarSize {
		utils.ErrorResponse(c, http.StatusBadRequest, fmt.Sprintf("File too large. Max size is %d MB.", maxAvatarSize>>20))
		return
	}
	if !h.allowedAvatarExt(file.Filename) {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid file type. Allowed: "+allowedAvatarTypes)
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext == ".jpeg" {
		ext = ".jpg"
	}
	relPath := filepath.Join("avatars", id+ext)
	absPath := filepath.Join(h.uploadDir, relPath)
	if err := os.MkdirAll(filepath.Dir(absPath), 0755); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to create upload directory")
		return
	}
	if err := c.SaveUploadedFile(file, absPath); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to save file")
		return
	}

	user, err := h.service.UpdateProfileAvatar(c.Request.Context(), id, relPath)
	if err != nil {
		_ = os.Remove(absPath)
		if errors.Is(err, ErrUserNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "User not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update user avatar")
		return
	}

	c.Header("Cache-Control", "private, max-age=86400")
	utils.SuccessResponse(c, http.StatusOK, "Profile picture updated successfully", user)
}

// DeleteUserAvatar removes a user's profile picture (admin only).
func (h *Handler) DeleteUserAvatar(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "User ID is required")
		return
	}

	user, err := h.service.GetUserByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "User not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to get user")
		return
	}

	if user.AvatarPath != "" {
		clean := filepath.Clean(user.AvatarPath)
		if !strings.Contains(clean, "..") && (strings.HasPrefix(clean, "avatars/") || strings.HasPrefix(clean, "avatars\\")) {
			absPath := filepath.Join(h.uploadDir, clean)
			_ = os.Remove(absPath)
		}
	}

	user, err = h.service.ClearUserAvatar(c.Request.Context(), id)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to remove profile picture")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Profile picture removed", user)
}

// ServeUserAvatar serves the avatar image for a user. GET /users/:id/avatar
func (h *Handler) ServeUserAvatar(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.Status(http.StatusNotFound)
		return
	}

	user, err := h.service.GetUserByID(c.Request.Context(), id)
	if err != nil || user.AvatarPath == "" {
		c.Status(http.StatusNotFound)
		return
	}

	clean := filepath.Clean(user.AvatarPath)
	if strings.Contains(clean, "..") || (!strings.HasPrefix(clean, "avatars/") && !strings.HasPrefix(clean, "avatars\\")) {
		c.Status(http.StatusNotFound)
		return
	}
	absPath := filepath.Join(h.uploadDir, clean)
	if _, err := os.Stat(absPath); os.IsNotExist(err) {
		c.Status(http.StatusNotFound)
		return
	}

	c.Header("Cache-Control", "private, max-age=86400")
	c.File(absPath)
}
