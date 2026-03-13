package finance

import (
	"log"
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

func (h *Handler) logAccess(c *gin.Context) {
	userID, _ := c.Get("userID")
	role, _ := c.Get("userRole")
	log.Printf("[finance] user=%v role=%v path=%s", userID, role, c.Request.URL.Path)
}

func (h *Handler) GetBudgetOverview(c *gin.Context) {
	h.logAccess(c)
	data, err := h.service.GetBudgetOverview(c.Request.Context())
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve budget overview")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Budget overview retrieved", data)
}

func (h *Handler) GetProfitability(c *gin.Context) {
	h.logAccess(c)
	data, err := h.service.GetProfitability(c.Request.Context())
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve profitability data")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Profitability data retrieved", data)
}

func (h *Handler) GetExpensesByMonth(c *gin.Context) {
	h.logAccess(c)
	data, err := h.service.GetExpensesByMonth(c.Request.Context())
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve expenses by month")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Expenses by month retrieved", data)
}

func (h *Handler) GetOverrunAlerts(c *gin.Context) {
	h.logAccess(c)
	data, err := h.service.GetOverrunAlerts(c.Request.Context())
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve overrun alerts")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Overrun alerts retrieved", data)
}

func (h *Handler) GetCashFlow(c *gin.Context) {
	h.logAccess(c)
	data, err := h.service.GetCashFlow(c.Request.Context())
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve cash flow data")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Cash flow retrieved", data)
}

func (h *Handler) GetProfitabilityTrend(c *gin.Context) {
	h.logAccess(c)
	data, err := h.service.GetProfitabilityTrend(c.Request.Context())
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve profitability trend")
		return
	}
	utils.SuccessResponse(c, http.StatusOK, "Profitability trend retrieved", data)
}
