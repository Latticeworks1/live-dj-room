# Live DJ Room

A real-time multiplayer live room application with voice chat, shared whiteboard, text chat, and synchronized audio playback.

## Features

- **Audio Player**: Upload and play audio files synchronized across all users
- **Push-to-Talk Voice Chat**: Real-time voice communication
- **Shared Whiteboard**: Collaborative drawing canvas
- **Text Chat**: Real-time messaging with typing indicators
- **User Presence**: See who's in the room

## Tech Stack

- **Backend**: Node.js, Express, Socket.IO
- **Frontend**: Vanilla JavaScript, HTML5 Canvas, Web Audio API
- **Real-time**: WebSocket-based communication

## Setup

### Prerequisites

- Node.js 16+ (installed via nvm)
- Modern web browser with microphone access

### Installation

1. Install server dependencies:
```bash
cd server
npm install
```

2. Start the server:
```bash
npm start
```

3. Open your browser to `http://localhost:3000`

## Usage

1. Enter a username to join the room
2. **Chat**: Type messages in the right panel
3. **Whiteboard**: Draw on the canvas using the color palette
4. **Audio**: Upload audio files and play them (synced with all users)
5. **Voice**: Hold the "Push to Talk" button to speak

## Project Structure

```
live-dj-room/
├── server/
│   ├── index.js          # Socket.IO server
│   └── package.json
└── client/
    ├── public/
    │   ├── index.html    # Main UI
    │   ├── style.css     # Styles
    │   └── app.js        # Client logic
    └── uploads/          # Uploaded audio files
```

## Development

To run with auto-reload:
```bash
cd server
npm run dev
```

## Port

Default: `3000` (configurable via `PORT` environment variable)

## Public Access

**Domain**: http://lyricai.latticeworks-ai.com:3000
**IP Address**: http://34.171.102.29:3000

⚠️ **IMPORTANT**: You need to open port 3000 in your GCP firewall first!
See `FIREWALL-SETUP.md` for instructions.

Once the firewall is configured, share the domain URL with friends to join your room!
