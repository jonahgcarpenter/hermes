package models

import "gorm.io/gorm"

type Server struct {
	gorm.Model
	Name         string `gorm:"not null"`
	IconURL      string
	OwnerID      uint   `gorm:"not null"`
	Owner        User   `gorm:"foreignKey:OwnerID"`
    
	// Security
	IsPrivate    bool   `gorm:"default:false"`
	PasswordHash string `json:"-"` // Hide from JSON output

	// Relationships
	Members      []User     `gorm:"many2many:server_members;"`
	Channels     []Channel  `gorm:"foreignKey:ServerID"`
}
