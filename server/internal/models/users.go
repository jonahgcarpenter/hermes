package models

import "gorm.io/gorm"

type User struct {
	gorm.Model
	GoogleID   string `gorm:"uniqueIndex"`
	Email      string `gorm:"uniqueIndex"`
	Name       string
	AvatarURL  string
	RefreshToken string `json:"-"`
}
