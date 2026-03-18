package middleware

import (
	"net/http"
	"sync"
	"time"

	"erp-project/pkg/utils"

	"github.com/gin-gonic/gin"
)

// ipCount holds request count and window start for one IP.
type ipCount struct {
	count int
	start time.Time
}

// AuthRateLimit returns a middleware that limits requests per client IP (e.g. 10 per minute for auth routes).
func AuthRateLimit(perMinute int) gin.HandlerFunc {
	if perMinute <= 0 {
		perMinute = 10
	}
	window := time.Minute
	var mu sync.Mutex
	visits := make(map[string]*ipCount)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		mu.Lock()
		now := time.Now()
		v, ok := visits[ip]
		if !ok || now.Sub(v.start) >= window {
			visits[ip] = &ipCount{count: 1, start: now}
			mu.Unlock()
			c.Next()
			return
		}
		v.count++
		if v.count > perMinute {
			mu.Unlock()
			utils.ErrorResponse(c, http.StatusTooManyRequests, "Too many requests")
			c.Abort()
			return
		}
		mu.Unlock()
		c.Next()
	}
}
