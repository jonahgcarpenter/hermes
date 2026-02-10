# Hermes

**Hermes** is a self-hosted, privacy-first replacement for Discord.

Designed for friend groups and communities who want total control over their data. One person hosts the server, and everyone else connects via the desktop client.

## Architecture: Client-Server

Hermes follows a traditional centralized architecture.

- **The Server (Go):** Acts as the central hub for all message routing, database storage, and WebRTC signaling.
- **The Client (Electron):** A lightweight desktop application that connects remotely to a specific Hermes server instance.

### Directory Structure

```text
hermes/
├── client/           # The Desktop App (Electron + React)
│   ├── src/
│   │   ├── main/     # Electron Main Process (Window & System networking)
│   │   └── renderer/ # The UI (React)
└── server/           # The Host Application (Go)
    ├── cmd/          # Entry point (main.go)
    └── internal/     # Core logic (Signaling, DB, Auth)
```
