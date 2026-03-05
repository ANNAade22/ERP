package database

import (
	"fmt"
	"log"

	"erp-project/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Config struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

func Connect(cfg Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		cfg.Host, cfg.User, cfg.Password, cfg.DBName, cfg.Port, cfg.SSLMode)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}

	log.Println("Connected to PostgreSQL database successfully.")

	// Auto Migrate the models
	err = db.AutoMigrate(
		&models.User{},
		&models.Project{},
		&models.Worker{},
		&models.Attendance{},
		&models.Expense{},
		&models.Vendor{},
		&models.Material{},
		&models.PurchaseRequest{},
		&models.StockMovement{},
		&models.Milestone{},
		&models.SitePhoto{},
	)
	if err != nil {
		return nil, err
	}

	log.Println("Database migration completed.")

	return db, nil
}
