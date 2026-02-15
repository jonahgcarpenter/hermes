package models

import "gorm.io/gorm"

type Channel struct {
	gorm.Model
	Name        string `gorm:"not null"`
	Type        string `gorm:"default:'text'"` // 'text' or 'voice'
	ServerID    uint   `gorm:"not null"`
	Server      Server `gorm:"foreignKey:ServerID"`
}
