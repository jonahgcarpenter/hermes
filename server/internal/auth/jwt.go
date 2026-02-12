package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/jonahgcarpenter/hermes/server/internal/config"
)

func GenerateAccessToken(userID string, cfg *config.Config) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(time.Minute * 15).Unix(), // 15 Minutes
		"iat": time.Now().Unix(),
		"iss": "hermes-server",
		"type": "access",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}

func GenerateRefreshToken(userID string, cfg *config.Config) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"exp": time.Now().Add(time.Hour * 24 * 30).Unix(), // 30 Days
		"type": "refresh",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}

func ValidateToken(tokenString string, cfg *config.Config) (*jwt.Token, error) {
	return jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(cfg.JWTSecret), nil
	})
}
