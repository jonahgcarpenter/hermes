# Hermes

**Hermes** is a self-hosted, privacy-first replacement for Discord.

Designed for friend groups and communities who want total control over their data. One person hosts the server, and everyone else connects via the desktop client.

## Architecture:

Hermes follows a traditional centralized architecture.

- **The Server (Go):** Acts as the central hub for all message routing, database storage, and WebRTC signaling.
- **The Client (Electron):** A lightweight desktop application that connects remotely to a specific Hermes server instance.
