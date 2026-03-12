package auth

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

func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	user, err := h.service.Register(c.Request.Context(), req)
	if err != nil {
		if errors.Is(err, ErrUserAlreadyExists) {
			utils.ErrorResponse(c, http.StatusConflict, err.Error())
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to register user")
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "User registered successfully", user)
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	token, err := h.service.Login(c.Request.Context(), req)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			utils.ErrorResponse(c, http.StatusUnauthorized, err.Error())
			return
		}
		if errors.Is(err, ErrUserInactive) {
			utils.ErrorResponse(c, http.StatusForbidden, err.Error())
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to login")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Login successful", gin.H{
		"token": token,
	})
}
