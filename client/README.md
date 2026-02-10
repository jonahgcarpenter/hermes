# Hermes Client

The desktop interface for Hermes, built with **Electron** and **React**.

Unlike the server, this application is a "Thin Client." It does not store data locally; instead, it connects to a remote Hermes Server to fetch chats and stream media.

## Tech Stack

- **Framework:** Electron.js
- **UI Library:** React + Vite
- **Networking:** WebSocket (Chat) & WebRTC (Voice/Video)

## Key Features

- **Server Browser:** Simple UI to input a Server Address (e.g., `hermes.myfriend.com` or `203.0.113.45`) and login credentials.
- **Media Engine:** Handles microphone input, camera capture, and desktop streaming locally.
- **Rich Chat:** Renders markdown text, embeds, and images served by the host.
