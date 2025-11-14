# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Live DJ Room is a real-time multiplayer web application combining synchronized audio playback, push-to-talk voice chat, collaborative whiteboard, and text chat. Built with Socket.IO for WebSocket communication.

## Architecture

### Technology Stack
- **Server**: Node.js + Express + Socket.IO 4.x
- **Client**: Vanilla JavaScript (no framework)
- **Real-time**: WebSocket bidirectional communication
- **APIs**: MediaRecorder API, Canvas API, Web Audio API, MediaDevices API

### Project Structure
```
live-dj-room/
├── server/
│   ├── index.js           # Socket.IO server with all event handlers
│   └── package.json
└── client/
    ├── public/
    │   ├── index.html     # Single-page app UI
    │   ├── style.css      # Complete styling
    │   └── app.js         # Client-side Socket.IO + UI logic
    └── uploads/           # Audio file storage (created at runtime)
```

### Server Architecture (`server/index.js`)

**Core Components:**
1. Express static file serving for client files
2. Multer middleware for audio file uploads (50MB limit, audio/* only)
3. Socket.IO server handling 5 feature domains

**Socket.IO Event Handlers:**
- **Chat**: `add user`, `new message`, `typing`, `stop typing`
- **Whiteboard**: `drawing`, `clear canvas`
- **Audio Sync**: `play audio`, `pause audio`, `seek audio`, `stop audio`
- **Voice**: `voice start`, `voice data`, `voice end`
- **Connection**: `connection`, `disconnect`

**State Management:**
- `numUsers`: Global user count
- `currentPlayback`: Synchronized audio state (url, playing, currentTime, startedAt)
- User session data stored in `socket.username`

**File Upload Endpoint:**
- `POST /upload-audio`: Accepts audio files, saves to uploads/, broadcasts to all clients

### Client Architecture (`client/public/app.js`)

**Feature Modules (IIFE pattern):**
1. **Login System**: Username entry, room join
2. **Chat System**: Send/receive messages, typing indicators, system notifications
3. **Whiteboard**: Canvas drawing with color selection, real-time sync
4. **Audio Player**: File upload, playlist management, synchronized playback
5. **Voice Chat**: MediaRecorder for push-to-talk, binary audio transmission

**Key Patterns:**
- Event delegation for dynamic elements
- Throttling for mousemove events (10ms)
- Escape HTML to prevent XSS in chat
- Responsive canvas sizing on window resize
- Binary data transmission via `Uint8Array` for voice

## Common Development Commands

### Environment Setup
```bash
# Node.js via nvm (required)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20
```

### Server
```bash
cd server
npm install           # Install dependencies
npm start             # Start server on port 3000
npm run dev           # Start with nodemon (auto-reload)
```

### Access
- Main app: http://localhost:3000
- Uploaded files: http://localhost:3000/uploads/

### Testing Locally
1. Start server in one terminal
2. Open http://localhost:3000 in multiple browser tabs/windows
3. Enter different usernames in each
4. Test features: chat, draw, upload audio, voice

## Feature Implementation Details

### Whiteboard Synchronization
- Canvas coordinates normalized (0-1) before transmission to support different screen sizes
- Drawing events throttled to 10ms to reduce network traffic
- Each drawing event transmits: `{x0, y0, x1, y1, color}` as relative coordinates
- Remote clients scale coordinates back using their canvas dimensions

### Audio Playback Sync
**Three-way sync mechanism:**
1. **Upload**: Server broadcasts `new audio` event with file URL
2. **Playback control**: Any user's play/pause/seek propagates to all others
3. **Late joiners**: Server sends current playback state on connection via `sync playback`

**State tracking:**
- `startedAt` timestamp enables time-based sync for late joiners
- Elapsed time calculated as: `(Date.now() - startedAt) / 1000`

### Push-to-Talk Voice
**Flow:**
1. Client requests microphone via `getUserMedia({ audio: true })`
2. On button press: Start MediaRecorder, emit `voice start`
3. Recording: Collect audio chunks
4. On button release: Stop recorder, emit `voice data` (binary), emit `voice end`
5. Server broadcasts binary audio to all other clients
6. Receivers create Audio element from Blob and auto-play

**Binary transmission:**
- AudioBlob → ArrayBuffer → Uint8Array → Socket.IO binary message
- Receiver: Uint8Array → Blob → Object URL → Audio element

### Chat System
**Typing indicators:**
- Debounced with `TYPING_TIMER_LENGTH = 400ms`
- Auto-clears if no typing activity for 400ms
- Broadcasts `typing`/`stop typing` events

**Message types:**
- User messages: Username + text, color-coded for own vs others
- System messages: Centered, italic, for join/leave/uploads

## Important Considerations

### Security
- HTML escaping in chat prevents XSS attacks
- File upload restricted to audio MIME types
- 50MB upload limit enforced server-side
- No authentication system (add if deploying publicly)

### Browser Compatibility
- Requires modern browser with:
  - MediaRecorder API support
  - getUserMedia support
  - Canvas API
  - WebSocket support
- Auto-play may be blocked by browser policies (caught and logged)

### Network Considerations
- Voice data transmitted as complete chunks (not streamed)
- Large audio files stored server-side (disk space management needed for production)
- No message history persistence (lost on server restart)
- No reconnection logic (refresh required if connection drops)

### Limitations
- No user authentication/authorization
- No persistent storage (users, messages, drawings)
- No room separation (all users in single global room)
- Voice chunks transmitted after recording stops (not real-time streaming)
- Canvas state not persisted (clears on refresh)

## Extending the Application

### Adding Rooms
Modify `server/index.js` to use Socket.IO rooms:
```javascript
socket.join(roomId);
io.to(roomId).emit('event', data);
```

### Adding Persistence
Consider adding:
- Database (MongoDB/PostgreSQL) for users, messages, rooms
- Redis for session management and caching
- S3/Cloud Storage for uploaded audio files

### Adding Authentication
Integrate passport.js or JWT tokens for user authentication before allowing room access.

### Improving Voice Quality
- Implement continuous streaming instead of chunk transmission
- Add WebRTC peer-to-peer connections for lower latency
- Implement voice activity detection (VAD)

## Environment Variables

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment mode (affects future features)

## File Upload Storage

Audio files stored in: `client/uploads/`
- Filename format: `{timestamp}-{random}-{originalname}`
- Consider cleanup strategy for production (delete old files)

## Deployment Information

### Current Deployment
- **Public IP**: 34.171.102.29
- **Port**: 3000
- **URL**: http://34.171.102.29:3000
- **Platform**: Google Cloud Platform (Debian-based VM)

### Server Configuration
- Server binds to `0.0.0.0:3000` (all network interfaces)
- Client auto-connects to same host that serves the page
- No hardcoded URLs (works on localhost and public IP)

### Firewall Requirements
GCP firewall must allow inbound TCP traffic on port 3000:
- See `FIREWALL-SETUP.md` for configuration steps
- Rule name: `allow-live-dj-room`
- Source ranges: `0.0.0.0/0` (public access)

### Starting the Server
Use the provided script:
```bash
./start-server.sh
```

Or manually:
```bash
cd server
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
npm start
```

### Production Considerations
- Add HTTPS/SSL for secure connections (voice/audio requires secure context in browsers)
- Set up domain name pointing to 34.171.102.29
- Use process manager (PM2) for auto-restart
- Configure nginx as reverse proxy
- Add rate limiting to prevent abuse
- Implement user authentication
