package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/jonahgcarpenter/hermes/server/internal/config"
)

func CreateToken(userID string, cfg *config.Config) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(time.Hour * 72).Unix(),
		"iat": time.Now().Unix(),
		"iss": "hermes-server",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString([]byte(cfg.JWTSecret))
}
