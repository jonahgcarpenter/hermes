# Hermes

Hermes is a self-hosted, privacy-first communication platform inspired by Discord's lack of privacy and data security. Built with performance and user data sovereignty in mind, it features real-time text messaging, voice communication, and server management.

## Architecture Overview

Hermes is split into two primary components: a highly concurrent Go backend and a cross-platform desktop client built with Electron and React.

### Backend (`/server`)
The backend is a robust RESTful API and real-time signaling server written in **Golang**.
* **Web Framework:** [Gin](https://gin-gonic.com/) for fast HTTP routing and middleware management.
* **Database & ORM:** [GORM](https://gorm.io/) backed by **PostgreSQL** for reliable data persistence. 
* **Real-time Messaging:** [Gorilla WebSockets](https://github.com/gorilla/websocket) for low-latency, bi-directional chat and event streaming.
* **Voice/Video:** [Pion WebRTC](https://github.com/pion/webrtc) for peer-to-peer real-time media communication.
* **Authentication:** JWT-based stateless authentication (`golang-jwt/jwt`).
* **ID Generation:** Twitter Snowflake algorithm (`bwmarrin/snowflake`) for distributed, time-sortable unique identifiers.

### Desktop Client (`/hermes`)
The client is a desktop application built using **Electron**, **React**, and **TypeScript**, heavily utilizing modern frontend tooling.
* **Build Tooling:** [Electron-Vite](https://electron-vite.org/) for blazing-fast Hot Module Replacement (HMR) and optimized builds.
* **UI Framework:** **React** with **Tailwind CSS** for modern, responsive, and customizable styling.
* **Routing & State:** `react-router-dom` for client-side routing.
* **API Communication:** `axios` for standard HTTP requests and native WebSockets for real-time events.
* **Icons:** `lucide-react` for clean, consistent iconography.

## Getting Started

### Prerequisites
* [Golang](https://go.dev/dl/)
* [Node.js](https://nodejs.org/)

### Setting up the Backend
1. Navigate to the server directory:
   ```
   cd server
   ```
2. Install Go dependencies:
   ```
   go mod download
   ```
3. Setup your **.env**:
   ```bash
   PORT=8080 # Default port when not specified
   DATABASE_URL=postgres://hermes:<password>localhost:5432/hermes # Defaults to SQLite when this URL is not set
   JWT_SECRET= # openssl rand -base64 32
   ```

5. Run the server:
   ```bash
   go run cmd/hermes/main.go # Non Reloading
   ```
   ```bash
   air # Reloading
   ```
### Setting up the Desktop Client
1. Navigate to the client directory:
   ```
   cd hermes
   ```
2. Install NPM dependencies:
   ```
   npm install
   ```
3. Start the development server with HMR:
   ```
   npm run dev
   ```

## Project Structure
```bash
├── hermes/                  # Electron/React desktop client
│   ├── build/               # Application assets and icons
│   ├── src/
│   │   ├── main/            # Electron main process (IPC handlers, window management)
│   │   ├── preload/         # Context bridge and IPC interfaces
│   │   └── renderer/        # React frontend (components, pages, context, hooks)
│   ├── electron-builder.yml # Build configuration for distribution
│   └── package.json         # Frontend dependencies and scripts
│
└── server/                  # Go backend
    ├── cmd/hermes/          # Application entrypoint
    ├── internal/
    │   ├── config/          # Environment and configuration loaders
    │   ├── controllers/     # HTTP route handlers (auth, users, servers, etc.)
    │   ├── database/        # DB connection and migrations
    │   ├── middleware/      # Auth and permission checks
    │   ├── models/          # GORM database schemas
    │   ├── webrtc/          # Pion WebRTC signaling and connection management
    │   └── websockets/      # Real-time message hub and client routing
    ├── go.mod               # Go module dependencies
    └── .air.toml            # Live-reloading configuration
```

## License
This project is open-sourced under the terms found in the [LICENSE](./LICENSE).
