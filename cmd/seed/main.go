// Seed demo data: vendors, projects, milestones, expenses.
// Run from project root: go run cmd/seed/main.go
// Requires .env with DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME

package main

import (
	"context"
	"log"
	"os"
	"time"

	"erp-project/internal/models"
	"erp-project/pkg/database"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env found, using env vars")
	}

	cfg := database.Config{
		Host:     getEnv("DB_HOST", "localhost"),
		Port:     getEnv("DB_PORT", "5432"),
		User:     getEnv("DB_USER", "postgres"),
		Password: getEnv("DB_PASSWORD", ""),
		DBName:   getEnv("DB_NAME", "erp"),
		SSLMode:  getEnv("DB_SSLMODE", "disable"),
	}

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("DB connect: %v", err)
	}

	ctx := context.Background()

	// Bootstrap admin if no admin exists (for demo: admin@erp.com / password123)
	var adminCount int64
	if err := db.WithContext(ctx).Model(&models.User{}).Where("role = ?", models.RoleAdmin).Count(&adminCount).Error; err == nil && adminCount == 0 {
		hash, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
		if err != nil {
			log.Fatalf("bcrypt: %v", err)
		}
		admin := models.User{
			Name:         "Admin",
			Email:        "admin@erp.com",
			PasswordHash: string(hash),
			Role:         models.RoleAdmin,
			Active:       true,
		}
		if err := db.WithContext(ctx).Create(&admin).Error; err != nil {
			log.Fatalf("Create admin: %v", err)
		}
		log.Println("Created bootstrap admin: admin@erp.com / password123")
	}

	// Get first user for ManagerID and CreatedBy
	var user models.User
	if err := db.WithContext(ctx).Where("role = ?", models.RoleAdmin).First(&user).Error; err != nil {
		if err := db.WithContext(ctx).First(&user).Error; err != nil {
			log.Fatalf("No users found. Run seed-demo-users first or create a user.")
		}
	}
	log.Printf("Using user: %s (%s)", user.Name, user.Email)

	// --- Vendors (for Vendors / Manage Contractors page) ---
	vendorDefs := []struct {
		name        string
		contactName string
		phone       string
		email       string
		address     string
		vendorType  string
		status      models.VendorStatus
		rating      int
		description string
	}{
		{"Sinar Bali", "Bali Contact", "081234", "sinarsisiseltan@gmail.com", "KAB. BADUNG", "KSO", models.VendorStatusInactive, 0, "Supplier for construction materials."},
		{"PT Amal Loponindo", "Amal Contact", "08123", "amal@gmail.id", "KAB. BONE", "KSO", models.VendorStatusPreferred, 5, "Preferred contractor for civil works."},
		{"CV Mitra Bangun", "Budi Santoso", "08123456789", "mitra@example.com", "Jakarta Selatan", "Contractor", models.VendorStatusActive, 4, "General contractor for residential projects."},
		{"Supplier Semen Nusantara", "Iwan Setiawan", "08234567890", "semen@example.com", "Tangerang", "Supplier", models.VendorStatusActive, 3, "Cement and building materials supplier."},
		{"Jasa Transport Logistik", "Ahmad Rizki", "08345678901", "logistik@example.com", "Bekasi", "Service Provider", models.VendorStatusActive, 4, "Heavy equipment and material transport."},
	}

	for _, v := range vendorDefs {
		var existing models.Vendor
		if err := db.WithContext(ctx).Where("name = ?", v.name).First(&existing).Error; err == nil {
			log.Printf("Using existing vendor: %s", v.name)
			continue
		}
		vendor := models.Vendor{
			Name:        v.name,
			ContactName: v.contactName,
			Phone:       v.phone,
			Email:       v.email,
			Address:     v.address,
			Type:        v.vendorType,
			Status:      v.status,
			Rating:      v.rating,
			Description: v.description,
			IsActive:    v.status != models.VendorStatusInactive,
		}
		if err := db.WithContext(ctx).Create(&vendor).Error; err != nil {
			log.Printf("Create vendor %q: %v", v.name, err)
			continue
		}
		log.Printf("Created vendor: %s (%s)", vendor.Name, vendor.Type)
	}
	log.Println("Vendors seed done.")

	// Build vendor name -> ID map for linking expenses
	var vendors []models.Vendor
	if err := db.WithContext(ctx).Find(&vendors).Error; err != nil {
		log.Printf("Could not load vendors: %v", err)
	}
	vendorByName := make(map[string]string)
	for i := range vendors {
		vendorByName[vendors[i].Name] = vendors[i].ID
	}

	// Create or find projects with budgets
	projectDefs := []struct {
		name string
		desc string
		loc  string
		status models.ProjectStatus
		budget float64
	}{
		{"Demo Construction - Phase 1", "Foundation and structure", "Site A", models.ProjectStatusInProgress, 100000},
		{"Demo Renovation Project", "Interior renovation", "Site B", models.ProjectStatusPlanning, 150000},
		{"Demo Maintenance Works", "Routine maintenance", "Site C", models.ProjectStatusCompleted, 80000},
	}

	var projects []models.Project
	for _, p := range projectDefs {
		var proj models.Project
		err := db.WithContext(ctx).Where("name = ?", p.name).First(&proj).Error
		if err != nil {
			proj = models.Project{
				Name: p.name, Description: p.desc, Location: p.loc, Status: p.status,
				Budget: p.budget, ManagerID: user.ID, CreatedBy: user.ID,
			}
			if err := db.WithContext(ctx).Create(&proj).Error; err != nil {
				log.Printf("Create project %q: %v", p.name, err)
				continue
			}
			log.Printf("Created project: %s (budget: $%.0f)", proj.Name, proj.Budget)
		} else {
			log.Printf("Using existing project: %s", proj.Name)
		}
		projects = append(projects, proj)
	}

	// Create milestones for completion %
	now := time.Now()
	milestoneDefs := []struct {
		projectIdx int
		title      string
		progress   float64
	}{
		{0, "Foundation complete", 100},
		{0, "Structure framing", 75},
		{0, "Roofing", 50},
		{1, "Design approval", 100},
		{1, "Materials ordered", 30},
		{2, "Inspection passed", 100},
	}

	for _, m := range milestoneDefs {
		if m.projectIdx >= len(projects) {
			continue
		}
		ms := models.Milestone{
			ProjectID: projects[m.projectIdx].ID,
			Title:     m.title,
			Progress:  m.progress,
			Status:    models.MilestoneStatusInProgress,
			Priority:  models.MilestonePriorityMedium,
		}
		ms.PlannedStart = &now
		end := now.AddDate(0, 2, 0)
		ms.PlannedEnd = &end
		if err := db.WithContext(ctx).Create(&ms).Error; err != nil {
			log.Printf("Milestone %q skip: %v", m.title, err)
		}
	}
	log.Println("Milestones created")

	// --- Materials (for Inventory / Stock Levels and Material Requests) ---
	materialDefs := []struct {
		projectIdx  int
		name        string
		unit        models.MaterialUnit
		currentStock float64
		minStock    float64
	}{
		{0, "Cement", models.MaterialUnitTon, 50, 20},
		{0, "Steel Rebar", models.MaterialUnitTon, 8, 10},
		{0, "Sand", models.MaterialUnitTon, 100, 30},
		{0, "Gravel", models.MaterialUnitTon, 15, 25},
		{1, "Cement", models.MaterialUnitTon, 20, 15},
		{1, "Paint", models.MaterialUnitLitre, 50, 20},
		{1, "Tiles", models.MaterialUnitSQFT, 200, 100},
		{2, "Cement", models.MaterialUnitTon, 5, 10},
		{2, "Replacement Parts", models.MaterialUnitPiece, 12, 5},
	}
	var materials []models.Material
	for _, m := range materialDefs {
		if m.projectIdx >= len(projects) {
			continue
		}
		pid := projects[m.projectIdx].ID
		var mat models.Material
		err := db.WithContext(ctx).Where("project_id = ? AND name = ?", pid, m.name).First(&mat).Error
		if err == nil {
			continue
		}
		mat = models.Material{
			ProjectID:    pid,
			Name:         m.name,
			Unit:         m.unit,
			CurrentStock: m.currentStock,
			MinStock:     m.minStock,
		}
		if err := db.WithContext(ctx).Create(&mat).Error; err != nil {
			log.Printf("Create material %q: %v", m.name, err)
			continue
		}
		materials = append(materials, mat)
	}
	if len(materials) > 0 {
		log.Printf("Created %d materials", len(materials))
	}

	// Reload all materials for this project set so we can reference by (project, name)
	var allMats []models.Material
	db.WithContext(ctx).Where("project_id IN ?", func() []string {
		ids := make([]string, len(projects))
		for i := range projects {
			ids[i] = projects[i].ID
		}
		return ids
	}()).Find(&allMats)
	matByProjectAndName := make(map[string]string) // "projectID|name" -> materialID
	for i := range allMats {
		matByProjectAndName[allMats[i].ProjectID+"|"+allMats[i].Name] = allMats[i].ID
	}

	// --- Purchase requests (for Material Requests and vendor stats) ---
	var prCount int64
	db.WithContext(ctx).Model(&models.PurchaseRequest{}).Count(&prCount)
	if prCount == 0 {
		prDefs := []struct {
			projectIdx  int
			matName     string
			vendorName  string
			qty         float64
			unitPrice   float64
			status      models.PurchaseRequestStatus
		}{
			{0, "Cement", "Supplier Semen Nusantara", 20, 850000, models.PurchaseRequestReceived},
			{0, "Steel Rebar", "Supplier Semen Nusantara", 5, 12000000, models.PurchaseRequestOrdered},
			{0, "Sand", "Jasa Transport Logistik", 50, 200000, models.PurchaseRequestApproved},
			{1, "Cement", "Supplier Semen Nusantara", 10, 850000, models.PurchaseRequestPending},
			{1, "Paint", "CV Mitra Bangun", 30, 150000, models.PurchaseRequestApproved},
			{2, "Cement", "PT Amal Loponindo", 5, 800000, models.PurchaseRequestReceived},
		}
		for _, pr := range prDefs {
			if pr.projectIdx >= len(projects) {
				continue
			}
			pid := projects[pr.projectIdx].ID
			matID, ok := matByProjectAndName[pid+"|"+pr.matName]
			if !ok {
				continue
			}
			vid, _ := vendorByName[pr.vendorName]
			total := pr.qty * pr.unitPrice
			prRec := models.PurchaseRequest{
				MaterialID:  matID,
				ProjectID:   pid,
				Quantity:    pr.qty,
				UnitPrice:   pr.unitPrice,
				TotalPrice:  total,
				Status:      pr.status,
				Notes:       "Demo seed",
				RequestedBy: user.ID,
			}
			if vid != "" {
				prRec.VendorID = &vid
			}
			if pr.status != models.PurchaseRequestPending && pr.status != models.PurchaseRequestRejected {
				prRec.ApprovedBy = &user.ID
			}
			prRec.Items = []models.PurchaseRequestItem{
				{MaterialID: matID, Quantity: pr.qty, UnitPrice: pr.unitPrice, TotalPrice: total},
			}
			if err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
				items := prRec.Items
				prRec.Items = nil
				if err := tx.Create(&prRec).Error; err != nil {
					return err
				}
				for i := range items {
					items[i].PurchaseRequestID = prRec.ID
				}
				return tx.Create(&items).Error
			}); err != nil {
				log.Printf("Create PR %s: %v", pr.matName, err)
				continue
			}
		}
		log.Println("Purchase requests created")
	}

	// --- Stock movements (optional, for Stock Levels history) ---
	if len(materials) > 0 {
		for _, mat := range materials {
			if mat.CurrentStock <= 0 {
				continue
			}
			mov := models.StockMovement{
				MaterialID:   mat.ID,
				ProjectID:    mat.ProjectID,
				MovementType: models.MovementTypeIn,
				Quantity:     mat.CurrentStock,
				Reason:       "Initial stock (demo seed)",
				PerformedBy:  user.ID,
			}
			_ = db.WithContext(ctx).Create(&mov).Error
		}
	}

	// Skip expense creation if projects already have expenses (avoid duplicates on re-run)
	var expenseCount int64
	for _, p := range projects {
		db.WithContext(ctx).Model(&models.Expense{}).Where("project_id = ?", p.ID).Count(&expenseCount)
		if expenseCount > 0 {
			log.Println("Projects already have expenses, skipping expense seed.")
			break
		}
	}
	if expenseCount == 0 {
		// Expenses: Project 0 (100k) - add 120k approved to create overrun
		// Project 1 - mix approved/pending, Project 2 - some approved (vendor-linked)
		expenseDefs := []struct {
			projectIdx int
			amount     float64
			category   models.ExpenseCategory
			desc       string
			status     models.ExpenseStatus
			vendorName string
		}{
			{0, 35000, models.ExpenseCategoryLabour, "Labour Phase 1", models.ExpenseStatusApproved, "CV Mitra Bangun"},
			{0, 45000, models.ExpenseCategoryMaterial, "Concrete and steel", models.ExpenseStatusApproved, "Supplier Semen Nusantara"},
			{0, 25000, models.ExpenseCategoryEquipment, "Equipment hire", models.ExpenseStatusApproved, "Jasa Transport Logistik"},
			{0, 15000, models.ExpenseCategoryTransport, "Material delivery", models.ExpenseStatusApproved, "Jasa Transport Logistik"},
			{0, 5000, models.ExpenseCategoryOverhead, "Site overhead", models.ExpenseStatusPending, ""},
			{1, 20000, models.ExpenseCategoryMaterial, "Design materials", models.ExpenseStatusApproved, "Supplier Semen Nusantara"},
			{1, 10000, models.ExpenseCategoryLabour, "Survey team", models.ExpenseStatusPending, ""},
			{2, 25000, models.ExpenseCategoryLabour, "Maintenance crew", models.ExpenseStatusApproved, "PT Amal Loponindo"},
			{2, 18000, models.ExpenseCategoryMaterial, "Replacement parts", models.ExpenseStatusApproved, "Supplier Semen Nusantara"},
			{2, 7000, models.ExpenseCategoryEquipment, "Tools", models.ExpenseStatusApproved, ""},
		}
		var totalApprovedByProject = make(map[string]float64)
		for _, e := range expenseDefs {
			if e.projectIdx >= len(projects) {
				continue
			}
			pid := projects[e.projectIdx].ID
			date := now.AddDate(0, -1, 0)
			exp := models.Expense{
				ProjectID:   pid,
				Category:    e.category,
				Amount:      e.amount,
				Description: e.desc,
				Date:        date,
				Status:      e.status,
				CreatedBy:   user.ID,
			}
			if e.status == models.ExpenseStatusApproved {
				exp.ApprovedBy = &user.ID
			}
			if e.vendorName != "" {
				if vid, ok := vendorByName[e.vendorName]; ok {
					exp.VendorID = &vid
				}
			}
			if err := db.WithContext(ctx).Create(&exp).Error; err != nil {
				log.Printf("Expense skip: %v", err)
				continue
			}
			if e.status == models.ExpenseStatusApproved {
				totalApprovedByProject[pid] += e.amount
			}
		}
		for pid, total := range totalApprovedByProject {
			_ = db.WithContext(ctx).Model(&models.Project{}).Where("id = ?", pid).Update("spent_amount", total).Error
		}
		log.Println("Expenses created")
	}

	// --- Equipment (for Equipment page demo) ---
	var equipmentCount int64
	db.WithContext(ctx).Model(&models.Equipment{}).Count(&equipmentCount)
	if equipmentCount == 0 {
		equipDefs := []struct {
			name        string
			eqType      models.EquipmentType
			manufacturer string
			model       string
			serial      string
			status      models.EquipmentStatus
			location    string
		}{
			{"Dump Truck A-01", models.EquipmentTypeDeliveryVehicle, "Volvo", "FH16", "VT-001", models.EquipmentStatusActive, "Site A"},
			{"Excavator EX-02", models.EquipmentTypeExcavator, "CAT", "320D", "CAT-320-002", models.EquipmentStatusActive, "Site A"},
			{"Crane C-01", models.EquipmentTypeCrane, "Liebherr", "LTM 1100", "LIE-1100-01", models.EquipmentStatusMaintenance, "Warehouse"},
			{"Road Roller R-01", models.EquipmentTypeRoadEquipment, "Hamm", "HD 90", "HAM-90-01", models.EquipmentStatusActive, "Site B"},
		}
		var equipmentList []models.Equipment
		for _, e := range equipDefs {
			eq := models.Equipment{
				Name:         e.name,
				Type:         e.eqType,
				Manufacturer: e.manufacturer,
				Model:        e.model,
				SerialNumber: e.serial,
				Status:       e.status,
				Location:     e.location,
				Notes:        "Demo seed",
			}
			if err := db.WithContext(ctx).Create(&eq).Error; err != nil {
				log.Printf("Create equipment %q: %v", e.name, err)
				continue
			}
			equipmentList = append(equipmentList, eq)
		}
		log.Printf("Created %d equipment items", len(equipmentList))

		// Upcoming maintenance (so dashboard shows data)
		if len(equipmentList) >= 2 {
			nextWeek := now.AddDate(0, 0, 7)
			maint := models.MaintenanceTask{
				EquipmentID:    equipmentList[2].ID, // Crane - under maintenance
				Type:          models.MaintenanceTypeRepair,
				ScheduledAt:   &nextWeek,
				AssignedTo:    user.ID,
				EstimatedHours: 8,
				Status:        models.MaintenanceStatusScheduled,
			}
			if err := db.WithContext(ctx).Create(&maint).Error; err != nil {
				log.Printf("Create maintenance: %v", err)
			}
			maint2 := models.MaintenanceTask{
				EquipmentID:    equipmentList[0].ID,
				Type:          models.MaintenanceTypeInspection,
				ScheduledAt:   &nextWeek,
				AssignedTo:    user.ID,
				EstimatedHours: 2,
				Status:        models.MaintenanceStatusScheduled,
			}
			_ = db.WithContext(ctx).Create(&maint2).Error
		}

		// Equipment schedule (assign to project)
		if len(equipmentList) > 0 && len(projects) > 0 {
			sched := models.EquipmentSchedule{
				ProjectID:    projects[0].ID,
				EquipmentID:  equipmentList[0].ID,
				OperatorName: "Budi (Demo)",
				ScheduleDate: now,
			}
			if err := db.WithContext(ctx).Create(&sched).Error; err != nil {
				log.Printf("Create schedule: %v", err)
			}
		}
		log.Println("Equipment seed done.")
	}

	log.Println("Finance demo seed completed.")
	log.Println("Projects with budgets and expenses created. Materials, PRs, and equipment seeded when empty.")
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
