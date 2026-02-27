package models

import (
	"time"
)

type Message struct {
	ID        uint64 `gorm:"primaryKey;autoIncrement:false" json:"id,string"`
	ChannelID uint64 `gorm:"not null;index" json:"channel_id,string"`
	AuthorID  uint64 `gorm:"not null;index" json:"author_id,string"`
	Content   string `gorm:"type:text;not null" json:"content"`

	// Relationships
	Author  User    `gorm:"foreignKey:AuthorID" json:"author"`
	Channel Channel `gorm:"foreignKey:ChannelID" json:"-"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
