# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the server code in this directory.

## Server Overview

Node.js + Express + Socket.IO server for Live DJ Room. Handles real-time communication, room management, file uploads, and state synchronization across multiple rooms.

## Architecture

### Core Components

**1. Express Server (`index.js:1-23`)**
- Static file serving from `../client/dist/` (Parcel build output)
- `/uploads` endpoint for serving uploaded audio files
- Startup validation: checks `dist/` exists, exits if missing

**2. Multer File Upload (`index.js:26-70`)**
- Audio upload endpoint: `POST /upload-audio`
- Allowed formats: mp3, wav, ogg, webm, m4a
- Max file size: 50MB
- Storage: `../client/uploads/` with timestamped filenames
- After upload: broadcasts `new audio` event to all clients

**3. Room Management System (`Room.js` + `index.js:72-80`)**
- `rooms` Map: `roomId → Room instance`
- Room class handles: users, settings, playback state, host transfer
- Rooms auto-delete when empty
- Host transfer: oldest user becomes host when current host leaves

**4. Socket.IO Event Handlers (`index.js:82-377`)**
- **Lobby events**: Global, not room-scoped
- **Room events**: Scoped to `socket.currentRoom` using Socket.IO rooms
- **Connection lifecycle**: `connection`, `disconnect`, session cleanup

### Event Architecture

**Event Categories**:

```javascript
// === LOBBY EVENTS (Global) ===
'add user'          // Set username on connect
'get rooms'         // Request room list
'rooms list'        // Send room list to client
'create room'       // Create new room (with callback)
'join room'         // Join existing room (with callback)
'leave room'        // Leave current room
'room created'      // Broadcast: new room added (lobby update)
'room updated'      // Broadcast: room changed (user count, host, etc.)
'room deleted'      // Broadcast: room removed (lobby update)

// === ROOM EVENTS (Scoped to room) ===
// Chat
'new message'       // Send/receive chat messages
'typing'            // User started typing
'stop typing'       // User stopped typing

// Whiteboard
'drawing'           // Drawing stroke data
'clear canvas'      // Clear whiteboard

// Audio Playback
'play audio'        // Start playing audio
'pause audio'       // Pause playback
'seek audio'        // Seek to position
'stop audio'        // Stop playback
'sync playback'     // Send current playback state to new joiners

// Voice Chat
'voice start'       // User started talking
'voice data'        // Binary audio data (Uint8Array)
'voice end'         // User stopped talking

// User Management
'user joined'       // New user entered room
'user left'         // User left room

// === CONNECTION ===
'connection'        // New socket connected
'disconnect'        // Socket disconnected
'login'             // Confirm user authentication
```

## Room Class (`Room.js`)

**Purpose**: Encapsulates all room state and logic

**Properties**:
```javascript
{
  id: string,              // UUID
  name: string,            // Display name
  host: string,            // Username of host
  createdAt: number,       // Timestamp
  users: Map<socketId, {username, joinedAt}>,
  settings: {
    maxUsers: number,      // Default: 10
    isPublic: boolean,     // Default: true
    password: string|null  // Optional password
  },
  currentPlayback: {
    url: string|null,      // Audio file URL
    playing: boolean,      // Is playing
    currentTime: number,   // Current position (seconds)
    startedAt: number|null // Timestamp when started (for sync)
  },
  canvasState: []          // Reserved for future whiteboard persistence
}
```

**Key Methods**:
- `addUser(socketId, username)` - Add user, throws if room full
- `removeUser(socketId)` - Remove user, returns `true` if room should delete
- `getUserCount()` - Get current user count
- `isHost(username)` - Check if user is host
- `toJSON()` - Serialize for client transmission (excludes password)
- `getUsernames()` - Get array of usernames

**Host Transfer Logic**:
When host leaves:
1. Find oldest user (by `joinedAt` timestamp)
2. Transfer `host` property to oldest user
3. Broadcast `room updated` so lobby shows new host

## Development Patterns

### Pattern 1: Socket Event Handler with Callback

**Use for**: Operations that need to respond to the client (create room, join room, etc.)

```javascript
socket.on('event name', (data, callback) => {
  try {
    // Validate input
    if (!socket.username) {
      return callback({ success: false, error: 'Not authenticated' });
    }

    // Perform operation
    const result = doSomething(data);

    // Respond to client
    callback({ success: true, data: result });

  } catch (error) {
    callback({ success: false, error: error.message });
  }
});
```

### Pattern 2: Room-Scoped Event Broadcast

**Use for**: Events that only affect users in the same room

```javascript
socket.on('event name', (data) => {
  // Get current room
  const room = getCurrentRoom(); // Helper function
  if (!room) return; // User not in a room, ignore

  // Broadcast to all users in room EXCEPT sender
  socket.to(socket.currentRoom).emit('event name', {
    username: socket.username,
    ...data
  });
});

// Helper function (already exists in index.js)
const getCurrentRoom = () => {
  if (!socket.currentRoom) return null;
  return rooms.get(socket.currentRoom);
};
```

### Pattern 3: Global Lobby Broadcast

**Use for**: Events that affect all users (room list changes)

```javascript
// Broadcast to ALL connected clients
io.emit('room created', room.toJSON());
io.emit('room updated', room.toJSON());
io.emit('room deleted', { roomId });
```

### Pattern 4: State Synchronization

**Use for**: Syncing state to late joiners (audio playback, whiteboard, etc.)

```javascript
socket.on('join room', ({ roomId }, callback) => {
  // ... join logic ...

  // Send current state to new user
  socket.emit('sync playback', room.currentPlayback);

  // Notify existing users
  socket.to(roomId).emit('user joined', {
    username: socket.username,
    numUsers: room.getUserCount()
  });

  callback({ success: true, room: room.toJSON() });
});
```

## Common Development Tasks

### Adding a New Room Feature

**Example**: Add "room description" field

1. **Update Room class** (`Room.js`):
```javascript
constructor(id, name, host, settings = {}) {
  // ... existing code ...
  this.description = settings.description || '';
}

toJSON() {
  return {
    // ... existing fields ...
    description: this.description
  };
}
```

2. **Add event handler** (`index.js`):
```javascript
socket.on('update room description', ({ description }, callback) => {
  const room = getCurrentRoom();
  if (!room) return callback({ success: false, error: 'Not in a room' });

  // Check if user is host
  if (!room.isHost(socket.username)) {
    return callback({ success: false, error: 'Only host can update' });
  }

  room.description = description;
  callback({ success: true });

  // Broadcast update to lobby
  io.emit('room updated', room.toJSON());
});
```

### Adding a New Room-Scoped Event

**Example**: Add "emoji reaction" feature

```javascript
socket.on('send reaction', ({ emoji }) => {
  const room = getCurrentRoom();
  if (!room) return;

  // Broadcast to room (including sender this time)
  io.to(socket.currentRoom).emit('reaction received', {
    username: socket.username,
    emoji,
    timestamp: Date.now()
  });
});
```

### Adding File Upload Support for New Type

**Example**: Allow image uploads for whiteboard

1. **Update Multer config** (`index.js:26-51`):
```javascript
const imageUpload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});
```

2. **Add upload endpoint**:
```javascript
app.post('/upload-image', imageUpload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileInfo = {
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`,
    size: req.file.size
  };

  res.json(fileInfo);
});
```

## State Management Best Practices

### Audio Playback Synchronization

**Time-based sync** (not position polling):

```javascript
// When starting playback
socket.on('play audio', (data) => {
  const room = getCurrentRoom();
  if (!room) return;

  room.currentPlayback = {
    url: data.url,
    playing: true,
    currentTime: 0,
    startedAt: Date.now() // Key: record start time
  };

  socket.to(socket.currentRoom).emit('play audio', data);
});

// When seeking
socket.on('seek audio', (data) => {
  const room = getCurrentRoom();
  if (!room) return;

  // Adjust startedAt to maintain sync
  if (room.currentPlayback.playing) {
    room.currentPlayback.startedAt = Date.now() - data.currentTime * 1000;
  } else {
    room.currentPlayback.currentTime = data.currentTime;
  }

  socket.to(socket.currentRoom).emit('seek audio', data);
});

// Late joiners calculate elapsed time:
// elapsedTime = (Date.now() - startedAt) / 1000
```

### Room Cleanup on Disconnect

**Always clean up** when user disconnects:

```javascript
socket.on('disconnect', () => {
  if (!socket.currentRoom) return;

  const room = rooms.get(socket.currentRoom);
  if (!room) return;

  const shouldDelete = room.removeUser(socket.id);

  // Notify remaining users
  socket.to(socket.currentRoom).emit('user left', {
    username: socket.username,
    numUsers: room.getUserCount()
  });

  if (shouldDelete) {
    // Room is empty, delete it
    rooms.delete(socket.currentRoom);
    io.emit('room deleted', { roomId: socket.currentRoom });
  } else {
    // Host may have transferred, update lobby
    io.emit('room updated', room.toJSON());
  }
});
```

## Development Commands

### Running the Server

```bash
# Production (serves from ../client/dist/)
npm start

# Development (auto-reload with nodemon)
npm run dev

# Lint code
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Format code with Prettier
npm run format
```

### Environment Variables

```bash
# Set custom port (default: 3000)
PORT=8080 npm start

# Future: Set environment
NODE_ENV=production npm start
```

### Debugging

**Enable Socket.IO debug logs**:
```bash
DEBUG=socket.io:* npm start
```

**Check room state** (add temporary debug endpoint):
```javascript
app.get('/debug/rooms', (req, res) => {
  const roomData = Array.from(rooms.values()).map(r => r.toJSON());
  res.json(roomData);
});
```

## Testing

### Manual Testing (Multi-Client)

1. **Start server**: `npm start`
2. **Open multiple browser tabs**: http://localhost:3000
3. **Test flows**:
   - Create room in tab 1 → verify appears in tab 2 lobby
   - Join room from tab 2 → verify user count updates
   - Send message in tab 1 → verify appears in tab 2
   - Leave room → verify host transfer, user count, room deletion

### Testing Room Capacity

```javascript
// In browser console (tab 1)
// Create room with max 2 users
// Then try joining from tabs 2, 3, 4
// Tab 4 should get "Room is full" error
```

### Testing Password Protection

```javascript
// Create private room with password "test123"
// Try joining without password → should fail
// Try joining with wrong password → should fail
// Try joining with correct password → should succeed
```

## Code Quality

### Pre-Commit Hooks

**Runs automatically** via Husky + lint-staged (`.husky/pre-commit`):

1. Custom checks: `scripts/pre-commit-checks.js`
   - Removes emojis from code
   - Scans for secrets (API keys, passwords)
   - Validates Socket.IO event naming (lowercase with spaces)
   - Warns about debugger statements
   - Checks file size (>500 lines)
   - Blocks .env files

2. ESLint: Auto-fixes issues
3. Prettier: Formats code

**Skip hooks** (emergency only):
```bash
git commit -m "hotfix" --no-verify
```

### Socket.IO Event Naming Convention

✅ **Correct**: `'new message'`, `'user joined'`, `'play audio'`
❌ **Wrong**: `'newMessage'`, `'userJoined'`, `'playAudio'`

**Rule**: Lowercase with spaces (not camelCase)

### Error Handling

**Always validate input**:
```javascript
socket.on('event', (data, callback) => {
  // Check authentication
  if (!socket.username) {
    return callback({ success: false, error: 'Not authenticated' });
  }

  // Validate required fields
  if (!data.name || !data.name.trim()) {
    return callback({ success: false, error: 'Name is required' });
  }

  // Check current state
  const room = getCurrentRoom();
  if (!room) {
    return callback({ success: false, error: 'Not in a room' });
  }

  // ... proceed ...
});
```

## Common Issues

### "dist/ directory not found!"

**Problem**: Server can't find client build files.
**Solution**:
```bash
cd ../client
npm run build
```

### Port 3000 already in use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill

# Or kill all node processes
pkill -f "node"
```

### Room state not persisting

**Expected behavior**: Rooms only exist in memory (Map). When server restarts, all rooms are lost.

**To add persistence**: Implement database (MongoDB/PostgreSQL) and save/load room state.

### Users not getting synced state

**Check**:
1. Is `sync playback` being sent on join? (`index.js:180`)
2. Is `room.currentPlayback` being updated correctly?
3. Check browser console for errors

### Host not transferring on leave

**Debug**:
1. Check `Room.removeUser()` logic (`Room.js:50-71`)
2. Verify `joinedAt` timestamps are set correctly
3. Check `room updated` event is being broadcast

## File Structure

```
server/
├── index.js                     # Main server (392 lines)
│   ├── Lines 1-23:   Express + static file serving
│   ├── Lines 26-70:  Multer file upload
│   ├── Lines 72-80:  Room management helpers
│   ├── Lines 82-221: Lobby event handlers
│   ├── Lines 223-351: Room event handlers
│   └── Lines 353-392: Disconnect + server startup
├── Room.js                      # Room class (125 lines)
│   ├── Lines 1-27:   Constructor + properties
│   ├── Lines 29-97:  User management methods
│   └── Lines 99-122: Utility methods
├── scripts/
│   └── pre-commit-checks.js     # Custom git hooks
├── .husky/
│   └── pre-commit               # Husky hook entry point
├── eslint.config.js             # ESLint configuration
└── package.json                 # Dependencies + scripts
```

## Dependencies

### Production
- `express`: ^4.18.2 - HTTP server
- `socket.io`: ^4.6.0 - WebSocket communication
- `multer`: ^1.4.5 - File upload handling
- `uuid`: ^13.0.0 - Room ID generation

### Development
- `nodemon`: ^3.0.1 - Auto-reload on changes
- `eslint`: ^9.39.1 - Code linting
- `prettier`: ^3.6.2 - Code formatting
- `husky`: ^9.1.7 - Git hooks
- `lint-staged`: ^16.2.6 - Pre-commit validation
- `eslint-plugin-security`: ^3.0.1 - Security linting

## Security Considerations

### File Upload Security

**Current protections**:
- File type validation (extension + MIME type)
- File size limit (50MB)
- Unique filenames (timestamp + random)

**Not implemented** (add for production):
- Virus scanning
- Authenticated uploads (anyone can upload)
- Storage quotas per user/room
- Automatic cleanup of old files

### Input Validation

**Always validate**:
- Room names (length, characters)
- Passwords (strength, length)
- User inputs (XSS prevention happens client-side)

**Example**:
```javascript
socket.on('create room', ({ name, settings }, callback) => {
  // Validate name
  if (!name || name.trim().length === 0) {
    return callback({ success: false, error: 'Room name required' });
  }
  if (name.length > 50) {
    return callback({ success: false, error: 'Room name too long' });
  }

  // Validate max users
  if (settings.maxUsers < 1 || settings.maxUsers > 100) {
    return callback({ success: false, error: 'Invalid max users' });
  }

  // ... proceed ...
});
```

### Authentication

**Current**: Relies on client-side Puter.js auth
**Issue**: No server-side validation of user identity
**Improvement**: Validate Puter tokens server-side

## Deployment

### Production Checklist

- [ ] Build client: `cd ../client && npm run build`
- [ ] Set environment: `NODE_ENV=production`
- [ ] Configure reverse proxy (nginx) for HTTPS
- [ ] Set up process manager (PM2) for auto-restart
- [ ] Configure firewall (allow port 3000)
- [ ] Set up logging (Winston, Morgan)
- [ ] Implement rate limiting
- [ ] Add monitoring (uptime, error tracking)

### PM2 Setup (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start index.js --name live-dj-room

# Auto-restart on server reboot
pm2 startup
pm2 save

# Monitor
pm2 monit

# View logs
pm2 logs live-dj-room
```

## Additional Resources

- Socket.IO Docs: https://socket.io/docs/v4/
- Express Docs: https://expressjs.com/
- Multer Docs: https://github.com/expressjs/multer
- Parent project CLAUDE.md: `../CLAUDE.md`
- Developer guide: `../DEVELOPER.md`
