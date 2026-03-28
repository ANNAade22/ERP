package middleware

import (
	"net/http"

	"erp-project/internal/models"
	"erp-project/pkg/utils"

	"github.com/gin-gonic/gin"
)

func RoleMiddleware(allowedRoles ...models.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		roleVal, exists := c.Get("userRole")
		if !exists || roleVal == nil {
			utils.ErrorResponse(c, http.StatusUnauthorized, "User role not found")
			c.Abort()
			return
		}
		roleStr, ok := roleVal.(string)
		if !ok || roleStr == "" {
			utils.ErrorResponse(c, http.StatusUnauthorized, "User role not found")
			c.Abort()
			return
		}

		userRole := models.Role(roleStr)

		isAllowed := false
		for _, allowedRole := range allowedRoles {
			if userRole == allowedRole {
				isAllowed = true
				break
			}
		}

		if !isAllowed {
			utils.ErrorResponse(c, http.StatusForbidden, "You do not have permission to access this resource")
			c.Abort()
			return
		}

		c.Next()
	}
}
