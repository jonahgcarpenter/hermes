# Hermes Server

The standalone backend for Hermes, written in **Go**. This is designed to be hosted on a Linux server to power your community.

## Tech Stack

- **Language:** Golang
- **Transport:** WebSocket (for real-time chat & signaling) + WebRTC (for voice/video/screen).
- **Database:** PostgreSQL.

## Features

- **User Management:** Handles authentication and permissions for connecting clients.
- **WebRTC Signaling:** Acts as the meeting point to help clients establish P2P or relayed media connections.
- **Persistent Storage:** Stores channel history and uploaded files locally.
