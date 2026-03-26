package database

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

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
	// Use DB_URL first so Neon (or any external DB) is not overridden by Render's auto-injected DATABASE_URL.
	// Then DATABASE_URL, then separate DB_* vars.
	dsn := os.Getenv("DB_URL")
	if dsn == "" {
		dsn = os.Getenv("DATABASE_URL")
	}
	if dsn == "" {
		dsn = fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
			cfg.Host, cfg.User, cfg.Password, cfg.DBName, cfg.Port, cfg.SSLMode)
	}

	logMode := logger.Info
	if os.Getenv("GIN_MODE") == "release" {
		logMode = logger.Warn
	}
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logMode),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	// Use higher defaults for better concurrency and allow env overrides.
	maxOpenConns := getEnvInt("DB_MAX_OPEN_CONNS", 150)
	maxIdleConns := getEnvInt("DB_MAX_IDLE_CONNS", 75)
	connMaxLifetimeMinutes := getEnvInt("DB_CONN_MAX_LIFETIME_MINUTES", 30)
	connMaxIdleTimeMinutes := getEnvInt("DB_CONN_MAX_IDLE_TIME_MINUTES", 10)

	sqlDB.SetMaxOpenConns(maxOpenConns)
	sqlDB.SetMaxIdleConns(maxIdleConns)
	sqlDB.SetConnMaxLifetime(time.Duration(connMaxLifetimeMinutes) * time.Minute)
	sqlDB.SetConnMaxIdleTime(time.Duration(connMaxIdleTimeMinutes) * time.Minute)

	log.Printf(
		"DB pool configured: max_open=%d max_idle=%d lifetime=%dm idle_time=%dm",
		maxOpenConns,
		maxIdleConns,
		connMaxLifetimeMinutes,
		connMaxIdleTimeMinutes,
	)

	log.Println("Connected to PostgreSQL database successfully.")

	autoMigrate := getEnvBool("AUTO_MIGRATE", true)
	if autoMigrate {
		err = db.AutoMigrate(
			&models.User{},
			&models.Project{},
			&models.Worker{},
			&models.Attendance{},
			&models.Expense{},
			&models.Vendor{},
			&models.Material{},
			&models.PurchaseRequest{},
			&models.PurchaseRequestItem{},
			&models.StockMovement{},
			&models.Milestone{},
			&models.SitePhoto{},
			&models.Equipment{},
			&models.MaintenanceTask{},
			&models.EquipmentSchedule{},
			&models.Invoice{},
			&models.Payment{},
		)
		if err != nil {
			return nil, err
		}
		log.Println("Database migration completed.")
	} else {
		log.Println("AUTO_MIGRATE=false, skipping schema auto-migration.")
	}

	return db, nil
}

func getEnvInt(key string, defaultValue int) int {
	val := os.Getenv(key)
	if val == "" {
		return defaultValue
	}

	parsed, err := strconv.Atoi(val)
	if err != nil || parsed <= 0 {
		log.Printf("Invalid %s value %q, using default %d", key, val, defaultValue)
		return defaultValue
	}

	return parsed
}

func getEnvBool(key string, defaultValue bool) bool {
	val := os.Getenv(key)
	if val == "" {
		return defaultValue
	}
	parsed, err := strconv.ParseBool(val)
	if err != nil {
		log.Printf("Invalid %s value %q, using default %v", key, val, defaultValue)
		return defaultValue
	}
	return parsed
}
