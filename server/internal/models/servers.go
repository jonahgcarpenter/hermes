package models

import (
	"time"
)

type Server struct {
	ID      uint64 `gorm:"primaryKey;autoIncrement:false" json:"id,string"`
	Name    string `gorm:"not null;size:100" json:"name"`
	IconURL string `json:"icon_url"`
	OwnerID uint64 `gorm:"not null;index" json:"owner_id,string"`

	// Relationships
	Owner    User           `gorm:"foreignKey:OwnerID" json:"-"`
	Channels []Channel      `gorm:"constraint:OnDelete:CASCADE;" json:"channels,omitempty"`
	Members  []ServerMember `gorm:"constraint:OnDelete:CASCADE;" json:"members,omitempty"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ServerMember struct {
	ServerID uint64 `gorm:"primaryKey;autoIncrement:false" json:"server_id,string"`
	UserID   uint64 `gorm:"primaryKey;autoIncrement:false" json:"user_id,string"`
	Role     string `gorm:"default:'member';not null" json:"role"`
	Nickname string `gorm:"size:32" json:"nickname,omitempty"`

	// Relationships
	User   User   `gorm:"foreignKey:UserID" json:"user"`
	Server Server `gorm:"foreignKey:ServerID" json:"-"`

	JoinedAt time.Time  `gorm:"autoCreateTime" json:"joined_at"`
	LeftAt   *time.Time `json:"left_at,omitempty"`
}
