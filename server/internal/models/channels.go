package models

import "time"

type ChannelType string

const (
	ChannelTypeText  ChannelType = "TEXT"
	ChannelTypeVoice ChannelType = "VOICE"
)

type Channel struct {
	ID       uint64      `gorm:"primaryKey;autoIncrement:false" json:"id,string"`
	ServerID uint64      `gorm:"not null;index" json:"server_id,string"`
	Name     string      `gorm:"not null;size:100" json:"name"`
	Type     ChannelType `gorm:"not null;default:'TEXT'" json:"type"`
	Position int         `gorm:"not null;default:0" json:"position"`

	// Relationships
	Messages []Message `gorm:"constraint:OnDelete:CASCADE;" json:"-"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	DeletedAt *time.Time `gorm:"index" json:"-"`
}
