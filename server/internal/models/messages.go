package models

import "gorm.io/gorm"

type Message struct {
	gorm.Model
	Content   string    `gorm:"not null"`
	ChannelID uint      `gorm:"not null"`
	UserID    uint      `gorm:"not null"`
	
	// Relations
	User User `gorm:"foreignKey:UserID"`
}
