package auth

import (
	"errors"
	"net/http"
	"os"
	"strconv"

	"erp-project/pkg/utils"

	"github.com/gin-gonic/gin"
)

const cookieName = "auth_token"

func useCookieAuth() bool {
	v, _ := strconv.ParseBool(os.Getenv("AUTH_USE_HTTPONLY_COOKIE"))
	return v
}

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
		if errors.Is(err, utils.ErrWeakPassword) {
			utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
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

	if useCookieAuth() {
		maxAge := 24 * 60 * 60 // 24h in seconds
		secure := os.Getenv("GIN_MODE") == "release"
		c.SetSameSite(http.SameSiteLaxMode)
		c.SetCookie(cookieName, token, maxAge, "/", "", secure, true)
	}

	utils.SuccessResponse(c, http.StatusOK, "Login successful", gin.H{
		"token": token,
	})
}

// Logout clears the httpOnly auth cookie when AUTH_USE_HTTPONLY_COOKIE is set (no-op otherwise).
func (h *Handler) Logout(c *gin.Context) {
	if useCookieAuth() {
		c.SetCookie(cookieName, "", -1, "/", "", false, true)
	}
	utils.SuccessResponse(c, http.StatusOK, "Logged out", nil)
}
