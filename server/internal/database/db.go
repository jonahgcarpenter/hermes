package database

import (
	"log"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/jonahgcarpenter/hermes/server/internal/config"
	"github.com/jonahgcarpenter/hermes/server/internal/models"
)

var DB *gorm.DB

func Connect(cfg *config.Config) {
	var connection *gorm.DB
	var err error

	dsn := cfg.DatabaseURL

	if dsn == "" {
		log.Println("DATABASE_URL is not set. Using local SQLite file (hermes.db) as backup.")
		connection, err = gorm.Open(sqlite.Open("./internal/database/hermes.db"), &gorm.Config{})
	} else {
		connection, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	}

	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Migrating database schema...")

	err = connection.SetupJoinTable(&models.User{}, "Servers", &models.ServerMember{})
	if err != nil {
		log.Fatalf("Failed to setup join table: %v", err)
	}

	err = connection.AutoMigrate(
		&models.User{},
		&models.Server{},
		&models.ServerMember{},
		&models.Channel{},
		&models.Message{},
	)

	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	DB = connection
}
