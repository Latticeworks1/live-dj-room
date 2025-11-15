# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Live DJ Room is a real-time multiplayer web application with **multi-room support**, synchronized audio playback, push-to-talk voice chat, collaborative whiteboard, and text chat. Built with Socket.IO for WebSocket communication and Puter.js for authentication.

## Architecture

### Technology Stack
- **Server**: Node.js + Express + Socket.IO 4.x
- **Client**: Vanilla JavaScript with Parcel bundler
- **Authentication**: Puter.js (cloud-based auth)
- **Real-time**: WebSocket bidirectional communication
- **Build**: Parcel 2.x for bundling and development

### Key Architectural Patterns

**1. Factory Pattern + Modular Architecture (Client)**
- Entry point: `client/src/app.js` orchestrates module initialization
- Feature modules in `client/src/modules/`: auth, lobby, chat, whiteboard, audio, voice
- Core utilities in `client/src/core/`: State, PageManager, Router, EventBus, Component
- UI components in `client/src/components/`: RoomCard, Message, Button

**2. Reactive State Management**
- `State.js` provides observable state with pub/sub pattern
- `appState` is the global singleton managing: username, rooms, currentRoomId, etc.
- Subscribe to state changes: `appState.subscribe('key', callback)`
- Update state: `appState.set('key', value)` or `appState.update({...})`

**3. Page Management System**
- `PageManager.js` handles SPA-like page transitions
- Three pages: 'login', 'lobby', 'room'
- Registration: `pageManager.register('pageName', '.css-selector')`
- Navigation: `pageManager.show('pageName')`

**4. Room-Based Server Architecture**
- `Room.js` class encapsulates room state and logic
- Server maintains `Map<roomId, Room>` for all active rooms
- Each room tracks: users, settings (maxUsers, password, isPublic), currentPlayback state
- Host transfer logic: when host leaves, oldest user becomes new host
- Auto-cleanup: rooms deleted when empty

**5. Socket.IO Event Scoping**
- **Lobby events**: Global (room listing, creation, join)
- **Room events**: Scoped to `socket.currentRoom` using Socket.IO rooms
- Pattern: `socket.to(roomId).emit(...)` for room-scoped broadcasts
- Pattern: `io.emit(...)` for global lobby updates

### Project Structure
```
live-dj-room/
├── server/
│   ├── index.js                    # Socket.IO server, room management
│   ├── Room.js                     # Room class definition
│   ├── scripts/pre-commit-checks.js # Custom pre-commit validation
│   └── package.json
└── client/
    ├── src/
    │   ├── app.js                  # Entry point, module orchestration
    │   ├── index.html              # HTML template
    │   ├── style.css               # Global styles
    │   ├── core/                   # Core utilities
    │   │   ├── State.js            # Reactive state management
    │   │   ├── PageManager.js      # Page navigation
    │   │   ├── Router.js           # URL routing
    │   │   ├── EventBus.js         # Event system
    │   │   └── Component.js        # Base component class
    │   ├── modules/                # Feature modules
    │   │   ├── auth.js             # Puter.js authentication
    │   │   ├── lobby.js            # Room browsing/creation
    │   │   ├── socket.js           # Socket.IO connection
    │   │   ├── chat.js             # Text chat
    │   │   ├── whiteboard.js       # Collaborative drawing
    │   │   ├── audio.js            # Synchronized audio player
    │   │   ├── voice.js            # Push-to-talk voice
    │   │   └── utils.js            # Utilities
    │   └── components/             # Reusable UI components
    │       ├── RoomCard.js         # Room list item
    │       ├── Message.js          # Chat message
    │       └── Button.js           # Button component
    └── dist/                       # Parcel build output (gitignored)
```

## Common Development Commands

### Environment Setup
Node.js 20 is required. Load nvm before running commands:
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20
```

### Client (Development)
```bash
cd client
npm install
npm start              # Start Parcel dev server (localhost:1234)
npm run build          # Production build to dist/
npm run clean          # Remove dist/ and .parcel-cache/
```

**Important**: Server expects built client in `client/dist/`. Run `npm run build` in client directory before starting server.

### Server
```bash
cd server
npm install
npm start              # Production mode (serves from client/dist/)
npm run dev            # Development with nodemon auto-reload
npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix ESLint issues
npm run format         # Format code with Prettier
```

### Full Development Workflow
```bash
# Terminal 1 - Build client
cd client
npm run build          # Or: npm start for dev server

# Terminal 2 - Run server
cd server
npm run dev            # Auto-reloads on changes
```

### Access Points
- **Client dev server**: http://localhost:1234 (Parcel)
- **Server**: http://localhost:3000
- **Public domain**: https://lyricai.latticeworks-ai.com
- **Public IP**: http://34.171.102.29:3000

## Key Implementation Details

### Authentication Flow (Puter.js)
1. App loads → `initAuth()` checks if user already signed in
2. If not signed in → show login page with "Sign in with Puter" button
3. User clicks button → `puter.auth.signIn()` redirects to Puter OAuth flow
4. Puter redirects back → page reloads, `checkAuthStatus()` detects sign-in
5. Get user info → `socket.emit('add user', username)` → show lobby

**Key files**: `client/src/modules/auth.js`, Puter SDK loaded in `index.html`

### Room Management Flow
**Create Room**:
1. User enters room name, settings (max users, password, public/private)
2. Client: `socket.emit('create room', {name, settings}, callback)`
3. Server: Creates Room instance with UUID, auto-joins creator
4. Server: `io.emit('room created', room.toJSON())` → updates lobby for all
5. Creator receives `callback({success: true, room})` → navigate to room page

**Join Room**:
1. User clicks room card in lobby
2. If password-protected → prompt for password
3. Client: `socket.emit('join room', {roomId, password}, callback)`
4. Server: Validates password, room capacity, adds user
5. Server: `socket.to(roomId).emit('user joined', ...)` → notify room members
6. Server: `socket.emit('sync playback', ...)` → sync new user with current audio
7. User receives callback → navigate to room page

**Leave Room**:
1. Client: `socket.emit('leave room')`
2. Server: Remove user, transfer host if needed, delete room if empty
3. Server: Broadcast `user left` to remaining users
4. Server: `io.emit('room deleted'|'room updated')` → update lobby

### State Synchronization Patterns

**Audio Playback Sync**:
- Room maintains `currentPlayback: {url, playing, currentTime, startedAt}`
- On play: `startedAt = Date.now()` for time-based sync
- Late joiners: Calculate elapsed time: `(Date.now() - startedAt) / 1000`
- Seek: Adjust `startedAt` to maintain sync: `startedAt = Date.now() - currentTime * 1000`

**Whiteboard Drawing**:
- Coordinates normalized (0-1) before transmission: `{x0, y0, x1, y1, color}`
- Receiver scales to their canvas: `x * canvas.width`
- Throttled to 10ms to reduce network traffic

**Voice Chat (Push-to-Talk)**:
1. Press button → `getUserMedia({audio: true})`
2. Start MediaRecorder → `socket.emit('voice start')`
3. Collect audio chunks while button held
4. Release → `socket.emit('voice data', Uint8Array)` → `socket.emit('voice end')`
5. Server broadcasts binary to all others in room
6. Receivers: Uint8Array → Blob → Object URL → Audio element

### Socket.IO Event Categories

**Lobby Events** (global):
- `add user` - Set username on connect
- `get rooms` / `rooms list` - Fetch room list
- `create room` - Create new room
- `join room` - Join existing room
- `room created` / `room updated` / `room deleted` - Lobby updates (broadcast)

**Room Events** (scoped to room):
- Chat: `new message`, `typing`, `stop typing`
- Whiteboard: `drawing`, `clear canvas`
- Audio: `play audio`, `pause audio`, `seek audio`, `stop audio`, `sync playback`
- Voice: `voice start`, `voice data`, `voice end`
- Users: `user joined`, `user left`

**Connection**:
- `connection`, `disconnect`, `login`, `leave room`

## Pre-Commit Hooks

**Automatic checks on every commit** (configured via Husky + lint-staged):

1. **Emoji removal** - Strips emojis from code (auto-fixed)
2. **Secret scanning** - Detects API keys, passwords, tokens (blocks commit)
3. **Debugger detection** - Warns about `debugger` statements
4. **File size check** - Warns if file > 500 lines
5. **Socket.IO naming** - Validates lowercase event names with spaces (not camelCase)
6. **.env protection** - Blocks .env files from being committed
7. **ESLint** - Runs linter (auto-fixes when possible)
8. **Prettier** - Formats code

**Files**: `.husky/pre-commit` → `server/scripts/pre-commit-checks.js`

**To skip** (emergency only): `git commit --no-verify`

## Important Patterns

### Module Initialization Order
1. **app.js** loads → initializes chat + audio (no auth needed)
2. **initAuth()** → waits for Puter SDK → checks auth status
3. On auth success → **initLobby()** → show lobby
4. On room join → **initWhiteboard()** + **initVoice()** → room features ready

### State Subscriptions (Reactive Updates)
```javascript
// Subscribe to room changes
appState.subscribe('currentRoomId', (roomId) => {
  if (roomId) {
    // User entered room - initialize features
    initWhiteboard();
    initVoice();
  }
});

// Update UI on user count change
appState.subscribe('userCount', (count) => {
  updateUserCount(count);
});
```

### Socket Event Handling Pattern
```javascript
// Client sends event with callback for response
socket.emit('create room', {name, settings}, (response) => {
  if (response.success) {
    // Handle success
  } else {
    // Handle error: response.error
  }
});

// Server uses callback to respond
socket.on('create room', ({name, settings}, callback) => {
  try {
    // ... logic ...
    callback({success: true, room});
  } catch (error) {
    callback({success: false, error: error.message});
  }
});
```

### Room Helper Pattern (Server)
```javascript
// Helper to get current room for socket
const getCurrentRoom = () => {
  if (!socket.currentRoom) return null;
  return rooms.get(socket.currentRoom);
};

// Use in event handlers
socket.on('new message', (data) => {
  const room = getCurrentRoom();
  if (!room) return; // User not in a room

  socket.to(socket.currentRoom).emit('new message', {
    username: socket.username,
    message: data
  });
});
```

## Testing Locally

### Multi-User Testing
1. Start server: `cd server && npm start`
2. Open multiple browser windows/tabs
3. Each tab: Sign in with different Puter account (or same account in different sessions)
4. Create/join rooms and test features

### Testing Workflow
- **Chat**: Send messages, verify typing indicators
- **Whiteboard**: Draw in one tab, verify it appears in others
- **Audio**: Upload file, play/pause/seek, verify sync across tabs
- **Voice**: Hold push-to-talk, verify others receive audio
- **Rooms**: Create public/private rooms, join with password, verify user counts

## Deployment Notes

### Current Deployment
- **Platform**: Google Cloud Platform (Debian VM)
- **Domain**: lyricai.latticeworks-ai.com
- **Public IP**: 34.171.102.29
- **Port**: 3000 (must be open in firewall)

### Build for Production
```bash
# 1. Build client
cd client
npm run build          # Outputs to dist/

# 2. Verify dist/ exists
ls -la dist/           # Should see index.html and bundled assets

# 3. Start server
cd ../server
npm start              # Serves from ../client/dist/
```

**Server checks**: On startup, server verifies `client/dist/` exists. If missing, prints error and exits.

### Firewall Configuration
GCP firewall must allow TCP port 3000:
- See `FIREWALL-SETUP.md` for setup
- Check `DOMAIN-STATUS.md` for current status

## Common Issues

### "dist/ directory not found!"
**Problem**: Server can't find built client files.
**Solution**:
```bash
cd client
npm run build
```

### Port 3000 already in use
```bash
# Kill existing process
lsof -ti:3000 | xargs kill

# Or kill all node processes
pkill -f "node"
```

### nvm command not found
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20
```

### Pre-commit hooks not running
```bash
cd server
npm install              # Reinstalls Husky hooks
```

### Authentication not working
- Check Puter SDK is loaded: Open browser console, type `puter`
- Verify internet connection (Puter requires external auth)
- Check for console errors in browser dev tools

### Room features not initializing
- Ensure you're actually in a room (check `appState.get('currentRoomId')`)
- Features only initialize when `currentRoomId` is set
- Check browser console for initialization logs: `[App] Entered room...`

## Code Quality Standards

### Socket.IO Event Naming Convention
- ✅ **Good**: `'new message'`, `'user joined'`, `'play audio'`
- ❌ **Bad**: `'newMessage'`, `'userJoined'`, `'playAudio'`
- **Rule**: Lowercase with spaces (not camelCase)

### File Organization
- Feature modules: Self-contained, export init functions
- Core utilities: Reusable, framework-agnostic
- Components: UI-only, take props, return DOM elements

### State Management
- **Never** mutate state directly
- **Always** use `appState.set()` or `appState.update()`
- Subscribe to changes for reactive updates

## External Dependencies

### Client
- `socket.io-client`: ^4.5.4
- `parcel`: ^2.9.3 (dev)
- **Puter.js SDK**: Loaded via CDN in index.html

### Server
- `express`: ^4.18.2
- `socket.io`: ^4.6.0
- `multer`: ^1.4.5-lts.1 (file uploads)
- `uuid`: ^13.0.0 (room ID generation)
- **Dev tools**: nodemon, eslint, prettier, husky, lint-staged

## Additional Documentation

- `README.md` - Quick start guide
- `DEVELOPER.md` - Detailed development guide
- `GETTING-STARTED.md` - First-time setup walkthrough
- `FIREWALL-SETUP.md` - GCP firewall configuration
- `DOMAIN-STATUS.md` - Deployment status
- `STATUS.md` - Project status and roadmap
- remmeber
- alwys use github and the github rpreomit hooks chces