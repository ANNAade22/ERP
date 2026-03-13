// Seed finance demo data: projects, milestones, expenses.
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

	// Get first user for ManagerID and CreatedBy
	var user models.User
	if err := db.WithContext(ctx).Where("role = ?", models.RoleAdmin).First(&user).Error; err != nil {
		if err := db.WithContext(ctx).First(&user).Error; err != nil {
			log.Fatalf("No users found. Run seed-demo-users first or create a user.")
		}
	}
	log.Printf("Using user: %s (%s)", user.Name, user.Email)

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

	// Skip expense creation if projects already have expenses (avoid duplicates on re-run)
	var expenseCount int64
	for _, p := range projects {
		db.WithContext(ctx).Model(&models.Expense{}).Where("project_id = ?", p.ID).Count(&expenseCount)
		if expenseCount > 0 {
			log.Println("Projects already have expenses, skipping expense seed.")
			log.Println("Finance demo seed completed.")
			return
		}
	}

	// Expenses: Project 0 (100k) - add 120k approved to create overrun
	// Project 1 - mix approved/pending
	// Project 2 - some approved
	expenseDefs := []struct {
		projectIdx int
		amount     float64
		category   models.ExpenseCategory
		desc       string
		status     models.ExpenseStatus
	}{
		{0, 35000, models.ExpenseCategoryLabour, "Labour Phase 1", models.ExpenseStatusApproved},
		{0, 45000, models.ExpenseCategoryMaterial, "Concrete and steel", models.ExpenseStatusApproved},
		{0, 25000, models.ExpenseCategoryEquipment, "Equipment hire", models.ExpenseStatusApproved},
		{0, 15000, models.ExpenseCategoryTransport, "Material delivery", models.ExpenseStatusApproved},
		{0, 5000, models.ExpenseCategoryOverhead, "Site overhead", models.ExpenseStatusPending},
		{1, 20000, models.ExpenseCategoryMaterial, "Design materials", models.ExpenseStatusApproved},
		{1, 10000, models.ExpenseCategoryLabour, "Survey team", models.ExpenseStatusPending},
		{2, 25000, models.ExpenseCategoryLabour, "Maintenance crew", models.ExpenseStatusApproved},
		{2, 18000, models.ExpenseCategoryMaterial, "Replacement parts", models.ExpenseStatusApproved},
		{2, 7000, models.ExpenseCategoryEquipment, "Tools", models.ExpenseStatusApproved},
	}

	var totalApprovedByProject = make(map[string]float64)

	for _, e := range expenseDefs {
		if e.projectIdx >= len(projects) {
			continue
		}
		pid := projects[e.projectIdx].ID
		date := now.AddDate(0, -1, 0) // 1 month ago
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
		if err := db.WithContext(ctx).Create(&exp).Error; err != nil {
			log.Printf("Expense skip: %v", err)
			continue
		}
		if e.status == models.ExpenseStatusApproved {
			totalApprovedByProject[pid] += e.amount
		}
	}

	// Update project spent_amount for approved expenses
	for pid, total := range totalApprovedByProject {
		if err := db.WithContext(ctx).Model(&models.Project{}).Where("id = ?", pid).Update("spent_amount", total).Error; err != nil {
			log.Printf("Update spent_amount for %s: %v", pid, err)
		}
	}

	log.Println("Finance demo seed completed.")
	log.Println("Projects with budgets and expenses created. At least one project (Phase 1) is over budget.")
}

func getEnv(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}
