package database

import (
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/jonahgcarpenter/hermes/server/internal/config"
	"github.com/jonahgcarpenter/hermes/server/internal/models"
)

var DB *gorm.DB

func Connect(cfg *config.Config) {
	dsn := cfg.DatabaseURL
	if dsn == "" {
		log.Fatal("DATABASE_URL is not set in .env")
	}

	connection, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Migrating database schema...")
	if err := connection.AutoMigrate(&models.User{}); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	DB = connection
}
