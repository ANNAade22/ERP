package main

import (
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"erp-project/internal/attendance"
	"erp-project/internal/auth"
	"erp-project/internal/dashboard"
	"erp-project/internal/equipment"
	"erp-project/internal/expenses"
	"erp-project/internal/finance"
	"erp-project/internal/inventory"
	"erp-project/internal/invoices"
	"erp-project/internal/models"
	"erp-project/internal/procurement"
	"erp-project/internal/projects"
	"erp-project/internal/users"
	"erp-project/pkg/database"
	"erp-project/pkg/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Connect to Database (set DB_SSLMODE=require in production)
	sslMode := os.Getenv("DB_SSLMODE")
	if sslMode == "" {
		sslMode = "disable"
	}
	dbConfig := database.Config{
		Host:     os.Getenv("DB_HOST"),
		Port:     os.Getenv("DB_PORT"),
		User:     os.Getenv("DB_USER"),
		Password: os.Getenv("DB_PASSWORD"),
		DBName:   os.Getenv("DB_NAME"),
		SSLMode:  sslMode,
	}

	db, err := database.Connect(dbConfig)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Initialize Repositories
	userRepo := users.NewRepository(db)
	projectRepo := projects.NewRepository(db)
	milestoneRepo := projects.NewMilestoneRepository(db)
	photoRepo := projects.NewPhotoRepository(db)
	attendanceRepo := attendance.NewRepository(db)
	expenseRepo := expenses.NewRepository(db)
	procurementRepo := procurement.NewRepository(db)
	inventoryRepo := inventory.NewRepository(db)
	equipmentRepo := equipment.NewRepository(db)

	// Initialize Services
	userService := users.NewService(userRepo)
	projectService := projects.NewService(projectRepo)
	milestoneService := projects.NewMilestoneService(milestoneRepo)
	attendanceService := attendance.NewService(attendanceRepo)
	expenseService := expenses.NewService(expenseRepo, projectRepo, db)
	procurementService := procurement.NewService(procurementRepo)
	inventoryService := inventory.NewService(inventoryRepo)
	equipmentService := equipment.NewService(equipmentRepo, projectRepo, userRepo)
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}
	authService := auth.NewService(userRepo, jwtSecret, 24*time.Hour)

	// Initialize Handlers
	authHandler := auth.NewHandler(authService)
	projectHandler := projects.NewHandler(projectService)
	milestoneHandler := projects.NewMilestoneHandler(milestoneService)
	uploadDir := os.Getenv("UPLOAD_DIR")
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	if err := os.MkdirAll(filepath.Join(uploadDir, "projects"), 0755); err != nil {
		log.Printf("Warning: could not create upload dir: %v", err)
	}
	if err := os.MkdirAll(filepath.Join(uploadDir, "avatars"), 0755); err != nil {
		log.Printf("Warning: could not create avatars dir: %v", err)
	}
	userHandler := users.NewHandler(userService, uploadDir)
	photoHandler := projects.NewPhotoHandler(photoRepo, projectRepo, uploadDir)
	attendanceHandler := attendance.NewHandler(attendanceService)
	expenseHandler := expenses.NewHandler(expenseService)
	procurementHandler := procurement.NewHandler(procurementService)
	inventoryHandler := inventory.NewHandler(inventoryService)
	dashboardService := dashboard.NewService(db)
	dashboardHandler := dashboard.NewHandler(dashboardService)
	equipmentHandler := equipment.NewHandler(equipmentService)
	financeService := finance.NewService(db)
	financeHandler := finance.NewHandler(financeService)
	invoiceRepo := invoices.NewRepository(db)
	invoiceService := invoices.NewService(db, invoiceRepo)
	invoiceHandler := invoices.NewHandler(invoiceService, uploadDir)

	// Setup Gin Router
	r := gin.Default()

	// CORS: allow only configured origins (set CORS_ORIGINS e.g. "http://localhost:3000,https://app.example.com")
	corsOrigins := os.Getenv("CORS_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = "http://localhost:3000,http://localhost:5173"
	}
	origins := strings.Split(strings.ReplaceAll(corsOrigins, " ", ""), ",")
	r.Use(cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Accept"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Routes
	api := r.Group("/api/v1")
	{
		// Public routes (rate-limited to prevent brute force)
		authGroup := api.Group("/auth")
		authGroup.Use(middleware.AuthRateLimit(10))
		{
			authGroup.POST("/register", authHandler.Register)
			authGroup.POST("/login", authHandler.Login)
			authGroup.POST("/logout", authHandler.Logout)
		}
		// Avatar images: public so <img src> can load without auth (same as many profile pic systems)
		api.GET("/users/:id/avatar", userHandler.ServeUserAvatar)

		// Protected routes
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(jwtSecret))
		{
			protected.GET("/profile", userHandler.GetProfile)
			protected.PATCH("/profile", userHandler.UpdateProfile)
			protected.POST("/profile/change-password", userHandler.ChangePassword)
			protected.GET("/users/assignable", middleware.RoleMiddleware(models.RoleAdmin, models.RoleProjectManager), userHandler.ListAssignableUsers)
			protected.GET("/users", middleware.RoleMiddleware(models.RoleAdmin), userHandler.ListUsers)
			protected.POST("/users", middleware.RoleMiddleware(models.RoleAdmin), userHandler.CreateUser)
			protected.POST("/users/:id/avatar", middleware.RoleMiddleware(models.RoleAdmin), userHandler.UploadUserAvatar)
			protected.DELETE("/users/:id/avatar", middleware.RoleMiddleware(models.RoleAdmin), userHandler.DeleteUserAvatar)
			protected.PATCH("/users/:id/role", middleware.RoleMiddleware(models.RoleAdmin), userHandler.UpdateUserRole)
			protected.PATCH("/users/:id/status", middleware.RoleMiddleware(models.RoleAdmin), userHandler.SetUserActive)
			protected.PATCH("/users/:id/password", middleware.RoleMiddleware(models.RoleAdmin), userHandler.ResetUserPassword)
			protected.DELETE("/users/:id", middleware.RoleMiddleware(models.RoleAdmin), userHandler.DeleteUser)

			// Projects CRUD — register more specific routes first (/:id/...) before generic /:id
			projectGroup := protected.Group("/projects")
			{
				projectGroup.POST("", middleware.RoleMiddleware(models.RoleAdmin), projectHandler.CreateProject)
				projectGroup.GET("", projectHandler.GetAllProjects)

				// Sub-resources under /projects/:id (must be before GET/PUT/DELETE /:id)
				projectGroup.GET("/:id/vendors", procurementHandler.GetVendorsByProject)
				projectGroup.GET("/:id/milestones", milestoneHandler.GetProjectMilestones)
				projectGroup.POST("/:id/milestones", middleware.RoleMiddleware(models.RoleAdmin, models.RoleProjectManager), milestoneHandler.CreateMilestone)
				projectGroup.GET("/:id/workers", attendanceHandler.GetWorkersByProject)
				projectGroup.GET("/:id/photos", photoHandler.ListPhotos)
				projectGroup.POST("/:id/photos", middleware.RoleMiddleware(models.RoleSiteEngineer, models.RoleAdmin, models.RoleProjectManager), photoHandler.UploadPhoto)
				projectGroup.GET("/:id/photos/:photoId/file", photoHandler.ServePhotoFile)
				projectGroup.DELETE("/:id/photos/:photoId", middleware.RoleMiddleware(models.RoleSiteEngineer, models.RoleAdmin, models.RoleProjectManager), photoHandler.DeletePhoto)

				// Single project (less specific)
				projectGroup.GET("/:id", projectHandler.GetProject)
				projectGroup.PUT("/:id", middleware.RoleMiddleware(models.RoleAdmin, models.RoleProjectManager), projectHandler.UpdateProject)
				projectGroup.DELETE("/:id", middleware.RoleMiddleware(models.RoleAdmin), projectHandler.DeleteProject)
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
				vendorGroup.DELETE("/:id", middleware.RoleMiddleware(models.RoleAdmin, models.RoleStoreOfficer), procurementHandler.DeleteVendor)
			}

			// Procurement
			procurementGroup := protected.Group("/procurement/requests")
			{
				procurementGroup.POST("", middleware.RoleMiddleware(models.RoleSiteEngineer, models.RoleStoreOfficer, models.RoleAdmin), procurementHandler.CreatePurchaseRequest)
				procurementGroup.GET("", procurementHandler.GetPurchaseRequestsByProject)
				procurementGroup.GET("/all", procurementHandler.GetAllPurchaseRequests)
				procurementGroup.GET("/pending", middleware.RoleMiddleware(models.RoleProjectManager, models.RoleAdmin), procurementHandler.GetPendingRequests)
				procurementGroup.GET("/:id", procurementHandler.GetPurchaseRequest)
				procurementGroup.PATCH("/:id", middleware.RoleMiddleware(models.RoleSiteEngineer, models.RoleStoreOfficer, models.RoleAdmin), procurementHandler.UpdatePurchaseRequest)
				procurementGroup.PATCH("/:id/status", middleware.RoleMiddleware(models.RoleProjectManager, models.RoleAdmin, models.RoleStoreOfficer), procurementHandler.UpdatePurchaseRequestStatus)
			}
			protected.GET(
				"/procurement/orders/recent",
				middleware.RoleMiddleware(models.RoleAdmin, models.RoleProjectManager, models.RoleStoreOfficer, models.RoleSiteEngineer),
				procurementHandler.GetRecentOrders,
			)

			// Inventory
			inventoryGroup := protected.Group("/inventory")
			{
				inventoryGroup.POST("/materials", middleware.RoleMiddleware(models.RoleStoreOfficer, models.RoleAdmin), inventoryHandler.CreateMaterial)
				inventoryGroup.GET("/materials", inventoryHandler.GetMaterialsByProject)
				inventoryGroup.GET("/materials/:id", inventoryHandler.GetMaterial)
				inventoryGroup.DELETE("/materials/:id", middleware.RoleMiddleware(models.RoleStoreOfficer, models.RoleAdmin), inventoryHandler.DeleteMaterial)
				inventoryGroup.POST("/stock-in", middleware.RoleMiddleware(models.RoleStoreOfficer, models.RoleAdmin), inventoryHandler.StockIn)
				inventoryGroup.POST("/stock-out", middleware.RoleMiddleware(models.RoleStoreOfficer, models.RoleAdmin), inventoryHandler.StockOut)
				inventoryGroup.GET("/movements/:materialId", inventoryHandler.GetStockMovements)
				inventoryGroup.GET("/low-stock", inventoryHandler.GetLowStockAlerts)
			}

			// Dashboard
			protected.GET("/dashboard", dashboardHandler.GetDashboard)

			// Invoices & Payments (role-protected: ADMIN, PROJECT_MANAGER, ACCOUNTANT)
			invoiceGroup := protected.Group("/invoices")
			invoiceGroup.Use(middleware.RoleMiddleware(models.RoleAdmin, models.RoleProjectManager, models.RoleAccountant))
			{
				invoiceGroup.GET("", invoiceHandler.ListInvoices)
				invoiceGroup.GET("/for-payment", invoiceHandler.GetInvoicesForPayment)
				invoiceGroup.POST("", invoiceHandler.CreateInvoice)
				invoiceGroup.GET("/:id", invoiceHandler.GetInvoice)
				invoiceGroup.GET("/:id/download", invoiceHandler.DownloadInvoice)
				invoiceGroup.POST("/:id/payments", invoiceHandler.RecordPayment)
			}

			// Finance (role-protected: ADMIN, PROJECT_MANAGER, ACCOUNTANT)
			financeGroup := protected.Group("/finance")
			financeGroup.Use(middleware.RoleMiddleware(models.RoleAdmin, models.RoleProjectManager, models.RoleAccountant))
			{
				financeGroup.GET("/budget-overview", financeHandler.GetBudgetOverview)
				financeGroup.GET("/profitability", financeHandler.GetProfitability)
				financeGroup.GET("/expenses-by-month", financeHandler.GetExpensesByMonth)
				financeGroup.GET("/overrun-alerts", financeHandler.GetOverrunAlerts)
				financeGroup.GET("/cash-flow", financeHandler.GetCashFlow)
				financeGroup.GET("/profitability-trend", financeHandler.GetProfitabilityTrend)
				financeGroup.GET("/vendor-spend", financeHandler.GetVendorSpend)
			}

			// Milestone Dashboard & Management
			milestoneGroup := protected.Group("/milestones")
			{
				milestoneGroup.GET("/dashboard-stats", milestoneHandler.GetDashboardStats)
				milestoneGroup.GET("/:id", milestoneHandler.GetMilestone)
				milestoneGroup.PUT("/:id", middleware.RoleMiddleware(models.RoleAdmin, models.RoleProjectManager), milestoneHandler.UpdateMilestone)
				milestoneGroup.DELETE("/:id", middleware.RoleMiddleware(models.RoleAdmin, models.RoleProjectManager), milestoneHandler.DeleteMilestone)
			}

			// Equipment — specific routes before /:id
			equipmentGroup := protected.Group("/equipment")
			equipmentRole := middleware.RoleMiddleware(models.RoleAdmin, models.RoleProjectManager)
			{
				equipmentGroup.GET("/dashboard", equipmentHandler.GetDashboard)
				equipmentGroup.GET("/scheduled", equipmentHandler.ListScheduled)
				equipmentGroup.POST("/scheduled", equipmentRole, equipmentHandler.CreateSchedule)
				equipmentGroup.PUT("/scheduled/:id", equipmentRole, equipmentHandler.UpdateSchedule)
				equipmentGroup.DELETE("/scheduled/:id", equipmentRole, equipmentHandler.DeleteSchedule)
				equipmentGroup.GET("", equipmentHandler.ListEquipment)
				equipmentGroup.POST("", equipmentRole, equipmentHandler.CreateEquipment)
				equipmentGroup.GET("/:id", equipmentHandler.GetEquipment)
				equipmentGroup.PUT("/:id", equipmentRole, equipmentHandler.UpdateEquipment)
				equipmentGroup.DELETE("/:id", equipmentRole, equipmentHandler.DeleteEquipment)
				equipmentGroup.GET("/:id/maintenance", equipmentHandler.ListMaintenance)
				equipmentGroup.POST("/:id/maintenance", equipmentRole, equipmentHandler.CreateMaintenance)
			}
			protected.PATCH("/maintenance/:id", equipmentRole, equipmentHandler.UpdateMaintenance)
			protected.DELETE("/maintenance/:id", equipmentRole, equipmentHandler.DeleteMaintenance)
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
