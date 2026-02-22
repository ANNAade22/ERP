package main

import (
	"log"
	"os"
	"time"

	"erp-project/internal/attendance"
	"erp-project/internal/auth"
	"erp-project/internal/dashboard"
	"erp-project/internal/expenses"
	"erp-project/internal/inventory"
	"erp-project/internal/models"
	"erp-project/internal/procurement"
	"erp-project/internal/projects"
	"erp-project/internal/users"
	"erp-project/pkg/database"
	"erp-project/pkg/middleware"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Connect to Database
	dbConfig := database.Config{
		Host:     os.Getenv("DB_HOST"),
		Port:     os.Getenv("DB_PORT"),
		User:     os.Getenv("DB_USER"),
		Password: os.Getenv("DB_PASSWORD"),
		DBName:   os.Getenv("DB_NAME"),
		SSLMode:  "disable",
	}

	db, err := database.Connect(dbConfig)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Initialize Repositories
	userRepo := users.NewRepository(db)
	projectRepo := projects.NewRepository(db)
	attendanceRepo := attendance.NewRepository(db)
	expenseRepo := expenses.NewRepository(db)
	procurementRepo := procurement.NewRepository(db)
	inventoryRepo := inventory.NewRepository(db)

	// Initialize Services
	userService := users.NewService(userRepo)
	projectService := projects.NewService(projectRepo)
	attendanceService := attendance.NewService(attendanceRepo)
	expenseService := expenses.NewService(expenseRepo, projectRepo)
	procurementService := procurement.NewService(procurementRepo)
	inventoryService := inventory.NewService(inventoryRepo)
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "super-secret-key" // Fallback for MVP
	}
	authService := auth.NewService(userRepo, jwtSecret, 24*time.Hour)

	// Initialize Handlers
	userHandler := users.NewHandler(userService)
	authHandler := auth.NewHandler(authService)
	projectHandler := projects.NewHandler(projectService)
	attendanceHandler := attendance.NewHandler(attendanceService)
	expenseHandler := expenses.NewHandler(expenseService)
	procurementHandler := procurement.NewHandler(procurementService)
	inventoryHandler := inventory.NewHandler(inventoryService)
	dashboardService := dashboard.NewService(db)
	dashboardHandler := dashboard.NewHandler(dashboardService)

	// Setup Gin Router
	r := gin.Default()

	// Routes
	api := r.Group("/api/v1")
	{
		// Public routes
		authGroup := api.Group("/auth")
		{
			authGroup.POST("/register", authHandler.Register)
			authGroup.POST("/login", authHandler.Login)
		}

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(jwtSecret))
		{
			protected.GET("/profile", userHandler.GetProfile)

			// Projects CRUD
			projectGroup := protected.Group("/projects")
			{
				projectGroup.POST("", middleware.RoleMiddleware(models.RoleAdmin), projectHandler.CreateProject)
				projectGroup.GET("", projectHandler.GetAllProjects)
				projectGroup.GET("/:id", projectHandler.GetProject)
				projectGroup.PUT("/:id", middleware.RoleMiddleware(models.RoleAdmin, models.RoleProjectManager), projectHandler.UpdateProject)
				projectGroup.DELETE("/:id", middleware.RoleMiddleware(models.RoleAdmin), projectHandler.DeleteProject)

				// Workers under a project
				projectGroup.GET("/:id/workers", attendanceHandler.GetWorkersByProject)
			}

			// Workers
			protected.POST("/workers", middleware.RoleMiddleware(models.RoleAdmin, models.RoleSiteEngineer), attendanceHandler.CreateWorker)

			// Attendance
			attendanceGroup := protected.Group("/attendance")
			{
				attendanceGroup.POST("", middleware.RoleMiddleware(models.RoleSiteEngineer, models.RoleAdmin), attendanceHandler.MarkAttendance)
				attendanceGroup.PATCH("/:id/checkout", middleware.RoleMiddleware(models.RoleSiteEngineer, models.RoleAdmin), attendanceHandler.CheckOut)
				attendanceGroup.GET("", attendanceHandler.GetAttendanceByDate)
				attendanceGroup.GET("/worker/:workerId", attendanceHandler.GetAttendanceByWorker)
			}

			// Expenses
			expenseGroup := protected.Group("/expenses")
			{
				expenseGroup.POST("", middleware.RoleMiddleware(models.RoleAccountant, models.RoleAdmin), expenseHandler.CreateExpense)
				expenseGroup.GET("", expenseHandler.GetExpensesByProject)
				expenseGroup.GET("/summary", expenseHandler.GetProjectSummary)
				expenseGroup.GET("/breakdown", expenseHandler.GetCategoryBreakdown)
				expenseGroup.GET("/:id", expenseHandler.GetExpense)
				expenseGroup.PATCH("/:id/status", middleware.RoleMiddleware(models.RoleAdmin, models.RoleProjectManager), expenseHandler.UpdateExpenseStatus)
				expenseGroup.DELETE("/:id", middleware.RoleMiddleware(models.RoleAdmin), expenseHandler.DeleteExpense)
			}

			// Vendors
			vendorGroup := protected.Group("/vendors")
			{
				vendorGroup.POST("", middleware.RoleMiddleware(models.RoleAdmin, models.RoleStoreOfficer), procurementHandler.CreateVendor)
				vendorGroup.GET("", procurementHandler.GetAllVendors)
				vendorGroup.GET("/:id", procurementHandler.GetVendor)
				vendorGroup.PUT("/:id", middleware.RoleMiddleware(models.RoleAdmin, models.RoleStoreOfficer), procurementHandler.UpdateVendor)
			}

			// Procurement
			procurementGroup := protected.Group("/procurement/requests")
			{
				procurementGroup.POST("", middleware.RoleMiddleware(models.RoleSiteEngineer, models.RoleStoreOfficer, models.RoleAdmin), procurementHandler.CreatePurchaseRequest)
				procurementGroup.GET("", procurementHandler.GetPurchaseRequestsByProject)
				procurementGroup.GET("/pending", middleware.RoleMiddleware(models.RoleProjectManager, models.RoleAdmin), procurementHandler.GetPendingRequests)
				procurementGroup.GET("/:id", procurementHandler.GetPurchaseRequest)
				procurementGroup.PATCH("/:id/status", middleware.RoleMiddleware(models.RoleProjectManager, models.RoleAdmin), procurementHandler.UpdatePurchaseRequestStatus)
			}

			// Inventory
			inventoryGroup := protected.Group("/inventory")
			{
				inventoryGroup.POST("/materials", middleware.RoleMiddleware(models.RoleStoreOfficer, models.RoleAdmin), inventoryHandler.CreateMaterial)
				inventoryGroup.GET("/materials", inventoryHandler.GetMaterialsByProject)
				inventoryGroup.GET("/materials/:id", inventoryHandler.GetMaterial)
				inventoryGroup.POST("/stock-in", middleware.RoleMiddleware(models.RoleStoreOfficer, models.RoleAdmin), inventoryHandler.StockIn)
				inventoryGroup.POST("/stock-out", middleware.RoleMiddleware(models.RoleStoreOfficer, models.RoleAdmin), inventoryHandler.StockOut)
				inventoryGroup.GET("/movements/:materialId", inventoryHandler.GetStockMovements)
				inventoryGroup.GET("/low-stock", inventoryHandler.GetLowStockAlerts)
			}

			// Dashboard
			protected.GET("/dashboard", dashboardHandler.GetDashboard)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server running on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
