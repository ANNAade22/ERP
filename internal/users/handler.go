package users

import (
	"errors"
	"net/http"

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

// ListUsers returns all users (admin only). Query: role= to filter by role.
func (h *Handler) ListUsers(c *gin.Context) {
	roleFilter := c.Query("role")
	users, err := h.service.ListUsers(c.Request.Context(), roleFilter)
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

// ListAssignableUsers returns id and name for all users (admin and project manager only).
func (h *Handler) ListAssignableUsers(c *gin.Context) {
	users, err := h.service.ListUsers(c.Request.Context(), "")
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
