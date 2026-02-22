package expenses

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

// CreateExpense handles POST /api/v1/expenses
func (h *Handler) CreateExpense(c *gin.Context) {
	var req CreateExpenseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	userID, _ := c.Get("userID")

	expense, err := h.service.CreateExpense(c.Request.Context(), req, userID.(string))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Expense created successfully", expense)
}

// GetExpense handles GET /api/v1/expenses/:id
func (h *Handler) GetExpense(c *gin.Context) {
	id := c.Param("id")

	expense, err := h.service.GetExpenseByID(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, ErrExpenseNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Expense not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve expense")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Expense retrieved successfully", expense)
}

// GetExpensesByProject handles GET /api/v1/expenses?project_id=...&from=...&to=...
func (h *Handler) GetExpensesByProject(c *gin.Context) {
	projectID := c.Query("project_id")
	if projectID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "project_id query param is required")
		return
	}

	from := c.Query("from")
	to := c.Query("to")

	var err error
	var expensesList []interface{}

	if from != "" && to != "" {
		results, e := h.service.GetExpensesByDateRange(c.Request.Context(), projectID, from, to)
		err = e
		for _, r := range results {
			expensesList = append(expensesList, r)
		}
	} else {
		results, e := h.service.GetExpensesByProject(c.Request.Context(), projectID)
		err = e
		for _, r := range results {
			expensesList = append(expensesList, r)
		}
	}

	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Expenses retrieved successfully", expensesList)
}

// UpdateExpenseStatus handles PATCH /api/v1/expenses/:id/status
func (h *Handler) UpdateExpenseStatus(c *gin.Context) {
	id := c.Param("id")

	var req UpdateExpenseStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	userID, _ := c.Get("userID")

	expense, err := h.service.UpdateExpenseStatus(c.Request.Context(), id, req, userID.(string))
	if err != nil {
		if errors.Is(err, ErrExpenseNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Expense not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Expense status updated", expense)
}

// DeleteExpense handles DELETE /api/v1/expenses/:id
func (h *Handler) DeleteExpense(c *gin.Context) {
	id := c.Param("id")

	err := h.service.DeleteExpense(c.Request.Context(), id)
	if err != nil {
		if errors.Is(err, ErrExpenseNotFound) {
			utils.ErrorResponse(c, http.StatusNotFound, "Expense not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete expense")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Expense deleted successfully", nil)
}

// GetProjectSummary handles GET /api/v1/expenses/summary?project_id=...
func (h *Handler) GetProjectSummary(c *gin.Context) {
	projectID := c.Query("project_id")
	if projectID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "project_id query param is required")
		return
	}

	summary, err := h.service.GetProjectExpenseSummary(c.Request.Context(), projectID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Project expense summary", summary)
}

// GetCategoryBreakdown handles GET /api/v1/expenses/breakdown?project_id=...
func (h *Handler) GetCategoryBreakdown(c *gin.Context) {
	projectID := c.Query("project_id")
	if projectID == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "project_id query param is required")
		return
	}

	breakdown, err := h.service.GetCategoryBreakdown(c.Request.Context(), projectID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Category breakdown", breakdown)
}
