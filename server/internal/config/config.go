package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port string
	DatabaseURL string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("Info: No .env file found, relying on default/system variables")
	}

	return &Config{
		Port: getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	if value, exists := os.LookupEnv(key); exists {
		boolValue, err := strconv.ParseBool(value)
		if err == nil {
			return boolValue
		}
	}
	return fallback
}
