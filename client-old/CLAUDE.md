# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Client Overview

This is the client-side application for Live DJ Room, a real-time multiplayer web application with multi-room support, synchronized audio playback, push-to-talk voice chat, collaborative whiteboard, and text chat. Built as a Single Page Application (SPA) with vanilla JavaScript and bundled using Parcel.

## Development Commands

### Environment Setup
Node.js 20 is required. Load nvm before running commands:
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20
```

### Development Workflow
```bash
# Install dependencies
npm install

# Development server with hot reload (http://localhost:1234)
npm start

# Production build (outputs to dist/)
npm run build

# Clean build artifacts
npm run clean
```

### Important Build Notes
- **Server expects built client**: The server serves files from `client/dist/`. Always run `npm run build` before starting the server in production mode.
- **Post-build verification**: After `npm run build`, the `verify-deployment.sh` script automatically checks that the public endpoints are accessible.
- **Development workflow**: Use `npm start` in client directory for hot-reload during development, OR build once with `npm run build` and run server in dev mode.

## Architecture Patterns

### Entry Point and Initialization Flow
**File**: `src/app.js`

The application follows a specific initialization sequence:
1. **Early initialization**: Chat and audio modules (don't require auth)
2. **Authentication**: `initAuth()` waits for Puter SDK, checks if user is signed in
3. **On auth success**: `initLobby()` is called to show room browser
4. **On room join**: `initWhiteboard()` and `initVoice()` are triggered via state subscription

**Critical pattern**: Room-specific features (whiteboard, voice) only initialize when `currentRoomId` changes in state. This prevents initialization errors when user is not in a room.

### Reactive State Management
**File**: `src/core/State.js`

The `State` class provides observable state with pub/sub pattern:
- **Global instance**: `appState` tracks username, connection, current room, etc.
- **Get values**: `appState.get('key')`
- **Set values**: `appState.set('key', value)` - triggers subscribed callbacks
- **Update multiple**: `appState.update({key1: val1, key2: val2})`
- **Subscribe to changes**: `appState.subscribe('key', (newVal, oldVal) => {...})`

**Why this matters**: State subscriptions drive UI updates and module initialization. When `currentRoomId` changes, the subscription in `app.js` automatically initializes room features.

### Page Management System
**File**: `src/core/PageManager.js`

Handles SPA-like page transitions between three pages: 'login', 'lobby', 'room'.

- **Registration**: `pageManager.register('pageName', '.css-selector')`
- **Navigation**: `pageManager.show('pageName')` - hides all other pages
- **Pattern**: Pages are pre-rendered in `index.html`, PageManager toggles visibility

### Client-Side Routing
**File**: `src/core/Router.js`

Uses HTML5 History API for URL routing with pattern matching:
- **Register routes**: `router.register('/path/:param', handler)`
- **Navigate**: `router.navigate('/path/value')` - updates URL and calls handler
- **Replace**: `router.replace('/path')` - no history entry
- **Params extraction**: Converts `:param` patterns to capture groups

**Note**: Router is implemented but not currently heavily used. PageManager handles most navigation.

### Module Organization
**Directory**: `src/modules/`

Each feature is a self-contained module that exports initialization functions:
- `auth.js` - Puter.js authentication flow
- `lobby.js` - Room browsing, creation, joining
- `socket.js` - Socket.IO connection singleton
- `chat.js` - Text chat UI and events
- `whiteboard.js` - Canvas drawing with WebSocket sync
- `audio.js` - Synchronized audio playback
- `voice.js` - Push-to-talk voice chat

**Pattern**: Modules are initialized by `app.js` in the correct order. Most modules import `socket`, `appState`, and `pageManager` from their respective files.

### Component System
**Directory**: `src/components/`

Reusable UI components that create DOM elements:
- **Factory pattern**: `RoomCard.create(room, onJoin)` returns a configured DOM element
- **Escape HTML**: Components sanitize user input with `escapeHtml()`
- **Event binding**: Components attach event listeners before returning elements

**Base class** (`src/core/Component.js`): Provides chainable API for building elements:
```javascript
const btn = new Component('button', {className: 'btn'})
  .setText('Click me')
  .on('click', handler)
  .mount(parentElement);
```

## Critical Implementation Details

### Authentication Flow (Puter.js)
**File**: `src/modules/auth.js`

1. **SDK loading**: `waitForPuter()` polls for `puter` global object (loaded via CDN in `index.html`)
2. **Check status**: `checkAuthStatus()` checks if user is already signed in (handles OAuth redirect)
3. **Sign in**: `puter.auth.signIn()` redirects to Puter OAuth, then redirects back
4. **On success**: Emit `'add user'` to socket → wait for `'login'` event → show lobby
5. **Sign out**: `puter.auth.signOut()` clears state and shows login page

**Key insight**: Page reloads after OAuth redirect, so `checkAuthStatus()` runs on every page load.

### Socket.IO Integration
**File**: `src/modules/socket.js`

- **Import pattern**: `import { socket } from './socket.js'` - singleton instance
- **Auto-connect**: `io()` with no args connects to same origin as page
- **Event namespaces**: Lobby events are global, room events are scoped to current room

### Lobby and Room Management
**File**: `src/modules/lobby.js`

**Create room flow**:
1. Collect: name, maxUsers, isPublic, password
2. Emit: `socket.emit('create room', {name, settings}, callback)`
3. On success: `enterRoom(room)` updates state and navigates to room page

**Join room flow**:
1. Find room in `appState.get('rooms')`
2. If password protected → prompt user
3. Emit: `socket.emit('join room', {roomId, password}, callback)`
4. On success: `enterRoom(room)`
5. **Duplicate join prevention**: `isJoining` flag prevents rapid double-clicks

**Leave room flow**:
1. Emit: `socket.emit('leave room')`
2. Clear room state: `currentRoomId`, `currentRoomName`, `isHost`, etc.
3. Navigate back to lobby and refresh room list

**Auto-refresh**: Lobby requests room list every 5 seconds. Stopped when entering a room.

### State-Driven Feature Initialization
**File**: `src/app.js` (lines 35-49)

```javascript
appState.subscribe('currentRoomId', (roomId) => {
  if (roomId) {
    // User entered a room - initialize room features
    initWhiteboard();
    initVoice();
  }
});
```

**Why this pattern**: Whiteboard and voice features require a room context. Subscribing to `currentRoomId` ensures they only initialize when user is actually in a room, preventing errors from missing DOM elements or server context.

## Project Structure

```
client/
├── src/
│   ├── app.js                  # Entry point, module orchestration
│   ├── index.html              # HTML template with three pages
│   ├── style.css               # Global styles
│   ├── core/                   # Framework-like utilities
│   │   ├── State.js            # Observable state management
│   │   ├── PageManager.js      # SPA page navigation
│   │   ├── Router.js           # Client-side routing
│   │   ├── EventBus.js         # Pub/sub event system
│   │   └── Component.js        # Base component class
│   ├── modules/                # Feature modules
│   │   ├── auth.js             # Puter.js authentication
│   │   ├── lobby.js            # Room browsing/creation
│   │   ├── socket.js           # Socket.IO singleton
│   │   ├── chat.js             # Text chat
│   │   ├── whiteboard.js       # Collaborative canvas
│   │   ├── audio.js            # Synchronized audio
│   │   └── voice.js            # Push-to-talk voice
│   └── components/             # Reusable UI components
│       ├── RoomCard.js         # Room list item
│       ├── Message.js          # Chat message
│       └── Button.js           # Button component
├── dist/                       # Parcel build output (gitignored)
├── uploads/                    # Audio file uploads (gitignored)
├── package.json
└── verify-deployment.sh        # Post-build endpoint verification
```

## Parcel Bundler Configuration

### Entry Point
Parcel builds from `src/index.html`, which imports `src/app.js` as a module:
```html
<script type="module" src="./app.js"></script>
```

### Output
- **Development**: `npm start` runs dev server on http://localhost:1234
- **Production**: `npm run build` outputs bundled files to `dist/`
  - `dist/index.html` - HTML with asset references updated
  - `dist/index.[hash].js` - Bundled JavaScript
  - `dist/index.[hash].css` - Bundled CSS

### Asset Resolution
- **Relative imports**: `import { socket } from './socket.js'` - resolved by Parcel
- **External CDN**: Puter SDK loaded via `<script>` tag in HTML, not bundled

## Important Patterns and Conventions

### Module Initialization Pattern
```javascript
// In module file
export function initModuleName() {
  // Check if already initialized to prevent duplicates
  if (isInitialized) return;
  isInitialized = true;

  // Get DOM elements
  const btn = document.getElementById('btn-id');

  // Clone and replace to remove old listeners
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  // Add new listeners
  newBtn.addEventListener('click', handler);

  // Register socket listeners
  socket.on('event name', handler);
}
```

### Preventing Duplicate Event Listeners
**Problem**: Re-initializing modules adds duplicate listeners.

**Solutions**:
1. **Clone and replace** (lobby.js): Replace DOM element to remove old listeners
2. **Initialization flag** (lobby.js line 8): Track `isInitialized` and early return
3. **Socket.off before on** (lobby.js lines 66-69): Remove old socket listeners before adding new ones

### State Subscription Cleanup
Subscriptions return unsubscribe functions:
```javascript
const unsubscribe = appState.subscribe('key', callback);
// Later: unsubscribe();
```

### Socket Event with Callback Pattern
```javascript
// Client
socket.emit('create room', data, (response) => {
  if (response.success) {
    // Handle success
  } else {
    alert('Error: ' + response.error);
  }
});

// Server responds via callback parameter
```

## Common Gotchas

### Puter SDK Loading Race Condition
**Issue**: `puter` global may not be available immediately on page load.

**Solution**: `waitForPuter()` polls for SDK with 10-second timeout (auth.js lines 50-71).

### Room Features Initialized Too Early
**Issue**: Calling `initWhiteboard()` or `initVoice()` before user joins a room fails.

**Solution**: Use state subscription to `currentRoomId` to trigger initialization (app.js lines 35-49).

### Duplicate Room Joins
**Issue**: User rapidly clicking join button sends multiple requests.

**Solution**: `isJoining` flag prevents duplicate requests (lobby.js lines 9, 127-130, 146-150).

### Auto-Refresh Continues After Leaving Lobby
**Issue**: Room list refresh interval continues running when user enters a room.

**Solution**: `stopAutoRefresh()` clears interval when entering room (lobby.js line 172).

### Build Required for Server
**Issue**: Server serves from `client/dist/`, not `client/src/`.

**Solution**: Always run `npm run build` in client before starting server in production.

## Testing Locally

### Multi-Tab Testing
1. Build client: `cd client && npm run build`
2. Start server: `cd ../server && npm run dev`
3. Open multiple browser tabs to http://localhost:3000
4. Sign in with different Puter accounts in each tab
5. Test: Create rooms, join, chat, draw, play audio, voice chat

### Public Endpoint Testing
After building, verify public endpoints:
```bash
cd client
npm run build  # Automatically runs verify-deployment.sh
```

The verification script checks:
- HTTPS domain is accessible (https://lyricai.latticeworks-ai.com)
- Public IP is accessible (http://34.171.102.29:3000)
- Bundled assets are being served

## Dependencies

### Runtime
- `socket.io-client`: ^4.5.4 - WebSocket communication
- **Puter SDK**: Loaded via CDN in index.html (not in package.json)

### Development
- `parcel`: ^2.9.3 - Zero-config bundler

### External Services
- **Puter.js**: Cloud authentication service, requires internet connection
- **Backend server**: Must be running for Socket.IO connection
