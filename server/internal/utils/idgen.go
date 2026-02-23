package utils

import (
	"log"

	"github.com/bwmarrin/snowflake"
)

var node *snowflake.Node

// Accepts NodeID as param, for future scaling use
// For now this is hardcoded as "1" in main.go
func InitIDGenerator(nodeID int64) {
	var err error
	node, err = snowflake.NewNode(nodeID)
	if err != nil {
		log.Fatalf("Failed to initialize Snowflake node: %v", err)
	}
}

// GenerateID returns a uint64 Snowflake ID
func GenerateID() uint64 {
	if node == nil {
		log.Fatal("Snowflake node not initialized. Call InitIDGenerator first.")
	}
	// Returns an int64 by default, but we cast it to uint64 to be super safe
	return uint64(node.Generate().Int64())
}
