package models

import (
	"time"
)

type User struct {
	ID           uint64    `gorm:"primaryKey;autoIncrement:false" json:"id,string"`
	Username     string    `gorm:"uniqueIndex;not null;size:32" json:"username"`
	Email        string    `gorm:"uniqueIndex;not null" json:"-"`
	PasswordHash string    `gorm:"not null" json:"-"`
	DisplayName  string    `gorm:"not null;size:32" json:"display_name"`
	AvatarURL    string    `json:"avatar_url"`
	Status       string    `gorm:"default:'offline'" json:"status"`

	// Relationships
	Servers  []Server  `gorm:"many2many:server_members;" json:"-"`
	Messages []Message `gorm:"foreignKey:AuthorID" json:"-"`
	
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	DeletedAt *time.Time `gorm:"index" json:"-"`
}
