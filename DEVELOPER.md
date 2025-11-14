# DEVELOPER.md

Complete developer guide for Live DJ Room - a real-time multiplayer web application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Architecture Deep Dive](#architecture-deep-dive)
3. [Development Workflow](#development-workflow)
4. [Code Organization](#code-organization)
5. [Git Workflow & Best Practices](#git-workflow--best-practices)
6. [Making Changes](#making-changes)
7. [What NOT to Do](#what-not-to-do)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)
10. [Contributing Guidelines](#contributing-guidelines)
11. [Appendix](#appendix)

---

## Getting Started

### Prerequisites

- **Node.js**: Version 16+ (managed via nvm)
- **npm**: Comes with Node.js
- **Modern Browser**: Chrome/Firefox/Edge with support for:
  - WebSocket API
  - MediaRecorder API
  - getUserMedia API
  - Canvas API
- **Microphone Access**: Required for push-to-talk voice chat
- **Git**: For version control

### Environment Setup

```bash
# Install/load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install and use Node.js 20
nvm install 20
nvm use 20
```

### Clone and Installation

```bash
# Clone the repository
git clone git@github.com:Latticeworks1/live-dj-room.git
cd live-dj-room

# Install server dependencies
cd server
npm install

# Return to project root
cd ..
```

### First-Time Setup Checklist

- [ ] nvm installed and configured
- [ ] Node.js 20 active (`node --version` shows v20.x.x)
- [ ] Server dependencies installed
- [ ] `client/uploads/` directory exists
- [ ] Port 3000 available (not in use)
- [ ] Microphone permissions granted in browser

### Verify Everything Works

```bash
# Start the server
cd server
npm start

# Expected output:
# Live DJ Room server listening on port 3000
# Local: http://localhost:3000

# Open browser to http://localhost:3000
# Enter a username
# You should see the main room interface
```

---

## Architecture Deep Dive

### High-Level Overview

Live DJ Room is a **single-room, multi-user real-time application** built on WebSocket technology. All users connect to the same global room with no authentication or room separation.

**Architecture Pattern**: Client-Server with bidirectional event-driven communication

```
Browser Clients <--WebSocket--> Socket.IO Server <--> In-Memory State
     ↓                                ↓
  app.js (IIFE)                  index.js (Node)
  Canvas/Audio/MediaRecorder     Express/Multer
```

### Server Architecture (`server/index.js`)

**Technology Stack**:
- **Express 4.18.2**: HTTP server & static file serving
- **Socket.IO 4.6.0**: WebSocket bidirectional communication
- **Multer 1.4.5**: Multipart form data (file uploads)
- **Node.js http module**: HTTP server

**State Management** (In-Memory):
```javascript
// Global room state
let numUsers = 0;  // Total connected users

let currentPlayback = {
  url: null,           // Currently playing audio file URL
  playing: false,      // Is audio playing?
  currentTime: 0,      // Current playback position (seconds)
  startedAt: null      // Timestamp when playback started
};

// Per-socket state
socket.username  // Stored on each socket connection
```

**Event Handlers** (17 total):
1. **Connection Lifecycle**: `connection`, `disconnect`
2. **Chat System** (4): `add user`, `new message`, `typing`, `stop typing`
3. **Whiteboard** (2): `drawing`, `clear canvas`
4. **Audio Sync** (4): `play audio`, `pause audio`, `seek audio`, `stop audio`
5. **Voice Chat** (3): `voice start`, `voice data`, `voice end`
6. **HTTP Endpoint** (1): `POST /upload-audio`

**Broadcasting Pattern**:
```javascript
// Broadcast to everyone except sender
socket.broadcast.emit('event name', data);

// Broadcast to everyone including sender
io.emit('event name', data);

// Send only to the sender
socket.emit('event name', data);
```

### Client Architecture (`client/public/app.js`)

**Pattern**: Single IIFE (Immediately Invoked Function Expression) with modular sections

**Structure**:
```javascript
(function() {
  'use strict';

  // 1. Socket.IO connection
  const socket = io();

  // 2. DOM Elements (cached at startup)
  const loginPage = document.querySelector('.login-page');
  // ... all elements

  // 3. State variables
  let username = '';
  let connected = false;
  // ... feature-specific state

  // 4. Feature modules (organized by comments)
  // ===== LOGIN =====
  // ===== CHAT =====
  // ===== WHITEBOARD =====
  // ===== AUDIO PLAYER =====
  // ===== VOICE CHAT =====

})();
```

**Key Patterns**:
- **Event Delegation**: Direct event listeners on elements
- **XSS Prevention**: `escapeHtml()` function for all user content
- **Throttling**: Whiteboard mouse events throttled to 10ms
- **Binary Data**: `Uint8Array` for voice transmission
- **Responsive Canvas**: Resize on window resize
- **Auto-scrolling**: Chat scrolls to bottom on new messages

### Data Flow for Each Feature

#### Chat System

```
User types → 'input' event → Start typing timer → emit('typing')
           → After 400ms → emit('stop typing')

User sends → sendMessage() → addChatMessage(own)
           → emit('new message', text)
           → Server broadcast → Other clients addChatMessage()

User joins → emit('add user', username)
           → Server: socket.username = username, ++numUsers
           → emit('login') to sender
           → broadcast('user joined') to others
```

#### Whiteboard

```
Mouse down → drawing = true, store current position
Mouse move (throttled 10ms) → drawLine locally
           → Normalize coords (x/w, y/h)
           → emit('drawing', {x0, y0, x1, y1, color})
           → Server broadcast
           → Other clients: Scale coords back (x*w, y*h), drawLine

Clear button → clearRect locally → emit('clear canvas')
             → Server broadcast → Other clients clearRect
```

**Why normalized coordinates?** Different screen sizes need relative positions (0-1 range) to draw correctly across devices.

#### Audio Playback Sync

```
Upload flow:
User selects file → FormData → POST /upload-audio
                  → Multer saves to uploads/
                  → io.emit('new audio', fileInfo)
                  → All clients add to playlist

Playback flow:
User clicks playlist item → mainAudio.src = url
                         → mainAudio.play()
                         → 'play' event listener
                         → emit('play audio', {url})
                         → Server: Update currentPlayback state
                         → broadcast('play audio')
                         → Other clients: set src, play()

Late joiner flow:
User connects → Server checks currentPlayback.url
              → emit('sync playback', currentPlayback)
              → Client: Calculate elapsed time
                elapsed = (now - startedAt) / 1000
              → mainAudio.currentTime = elapsed
              → mainAudio.play()
```

#### Push-to-Talk Voice

```
Initialize:
getUserMedia({audio: true}) → mediaStream stored → Button enabled

Button press (mousedown):
startTalking() → emit('voice start')
               → new MediaRecorder(mediaStream)
               → mediaRecorder.start()
               → ondataavailable: collect chunks

Button release (mouseup):
stopTalking() → mediaRecorder.stop()
              → onstop: Create Blob from chunks
              → Blob → ArrayBuffer → Uint8Array
              → emit('voice data', Uint8Array)
              → emit('voice end')

Receiving voice:
on('voice start') → Show "{username} is talking..." indicator
on('voice data') → Uint8Array → Blob → Object URL
                 → new Audio(url) → audio.play()
on('voice end') → Remove indicator
```

---

## Development Workflow

### Starting the Dev Server

**Option 1: Standard mode**
```bash
cd server
npm start
# Server runs on http://localhost:3000
```

**Option 2: Auto-reload mode (nodemon)**
```bash
cd server
npm run dev
# Auto-restarts on file changes
```

**Using the startup script**:
```bash
./start-server.sh
# Automatically loads nvm and starts server
```

### Testing Changes Locally

**Single-user testing**:
1. Start server
2. Open http://localhost:3000
3. Enter username
4. Test feature

**Multi-user testing** (essential for real-time features):
1. Start server
2. Open multiple browser windows/tabs
3. Use incognito/private windows for separate sessions
4. Enter different usernames in each
5. Test interactions between users

**Pro tip**: Use browser dev tools in each window to monitor:
- Network tab: WebSocket messages
- Console: Client-side logs
- Server terminal: Server-side logs

### Debugging Socket.IO Events

**Server-side**:
```javascript
// Add to server/index.js
socket.onAny((eventName, ...args) => {
  console.log(`[${socket.id}] ${eventName}:`, args);
});
```

**Client-side**:
```javascript
// Add to client/public/app.js
socket.onAny((eventName, ...args) => {
  console.log(`[Received] ${eventName}:`, args);
});
```

**Chrome DevTools**:
1. Open DevTools (F12)
2. Network tab → WS (WebSocket) filter
3. Click on socket.io connection
4. View "Messages" tab
5. See real-time event flow

---

## Code Organization

### File Structure

```
live-dj-room/
├── server/
│   ├── index.js          # Main server file (180 lines)
│   │                     # - Express setup
│   │                     # - Multer config
│   │                     # - Upload endpoint
│   │                     # - Socket.IO handlers
│   ├── package.json      # Dependencies & scripts
│   └── node_modules/     # npm packages (gitignored)
│
├── client/
│   ├── public/
│   │   ├── index.html    # UI structure
│   │   ├── style.css     # Complete styling
│   │   └── app.js        # Client logic (445 lines)
│   └── uploads/          # Audio file storage (gitignored)
│
├── README.md             # Project overview
├── CLAUDE.md             # AI assistant guidance
├── DEVELOPER.md          # This file
├── .gitignore            # Git ignore rules
└── start-server.sh       # Server startup script
```

### Where to Add New Features

**New Socket.IO event**:
- Server handler: `server/index.js` (inside `io.on('connection')`)
- Client emitter: `client/public/app.js` (in appropriate feature section)
- Client listener: `client/public/app.js` (in appropriate feature section)

**New UI component**:
- HTML structure: `client/public/index.html`
- Styling: `client/public/style.css`
- Behavior: `client/public/app.js` (new section with `// ===== FEATURE =====` comment)

**New HTTP endpoint**:
- Add route: `server/index.js` (before `io.on('connection')`)

### Coding Conventions

**JavaScript Style**:
- **Strict mode**: `'use strict';` at top of IIFE
- **Const/Let**: No `var` usage
- **Semicolons**: Always used
- **String quotes**: Single quotes for strings
- **Indentation**: 2 spaces
- **Naming**:
  - Variables: camelCase (`currentColor`, `mediaStream`)
  - Constants: UPPER_SNAKE_CASE (`TYPING_TIMER_LENGTH`)
  - DOM elements: Descriptive with `El` suffix (`messagesEl`)
  - Functions: Verb-first camelCase (`addChatMessage`)

**Event Naming Pattern**:
```javascript
// Pattern: <noun> <verb>
'add user'         // User-related action
'new message'      // Message-related action
'play audio'       // Audio-related action
'voice start'      // Voice-related action
```

---

## Git Workflow & Best Practices

### ⚠️ CRITICAL: Commit and Push Regularly

**ALWAYS COMMIT BEFORE MAJOR CHANGES**
```bash
# Before refactoring, adding features, or making risky changes
git add .
git commit -m "Checkpoint before [description of change]"
```

**⚠️ ALWAYS PUSH TO GITHUB REGULARLY**
```bash
# At minimum, push:
# - After completing a feature
# - Before deployment
# - At end of coding session
git push origin main
```

**Why?** This project lives on a GCP VM. If the VM crashes or you accidentally delete files, GitHub is your only backup.

### Commit Message Format

**Current pattern**:
```
<Type>: <Description>

Examples:
feat: Add volume control slider
fix: Correct whiteboard coordinate scaling
docs: Update DEVELOPER.md with API reference
refactor: Extract chat logic into separate file
```

### Daily Workflow

```bash
# Start of day
git pull origin main              # Get latest changes

# During development
git status                         # Check what changed
git add <files>                    # Stage specific files
git commit -m "descriptive message"  # Commit with clear message

# End of day (or after feature complete)
git push origin main              # ⚠️ ALWAYS push to backup your work
```

### Before Deploying to Production

```bash
# 1. Commit all changes
git add .
git commit -m "feat: [description]"

# 2. Create a backup tag
git tag v1.0.$(date +%Y%m%d-%H%M)
git push origin --tags

# 3. Push to GitHub
git push origin main

# 4. Now safe to deploy
```

### Automated Pre-Commit Hooks

This project uses **Husky** and **lint-staged** to automatically check and fix code quality issues before every commit.

**What runs automatically on commit:**

1. **Emoji Removal** - Removes emojis from code files (preserves in comments)
2. **Secret Detection** - Scans for API keys, passwords, tokens
3. **Code Linting** - ESLint checks for code quality issues
4. **Code Formatting** - Prettier formats code consistently
5. **Security Checks** - eslint-plugin-security scans for vulnerabilities
6. **File Size Check** - Warns about files > 500 lines
7. **Debugger Detection** - Warns about debugger statements
8. **Socket.IO Event Naming** - Validates event naming conventions
9. **.env Protection** - Prevents committing .env files

**Example output:**
```bash
git commit -m "feat: Add new feature"

🔍 Running pre-commit checks...

⚠️  [index.js] Found 2 emoji(s) - removing...
✅ [index.js] Cleaned and updated

✅ All pre-commit checks passed!

[main abc1234] feat: Add new feature
 1 file changed, 10 insertions(+)
```

**If checks fail:**
```bash
❌ [index.js] SECURITY: Potential API Key detected!
   Matches: api_key = "sk-abc123..."
   ⚠️  Remove sensitive data before committing!

❌ Pre-commit checks FAILED - fix errors above
   Use --no-verify to skip (NOT RECOMMENDED)
```

**Manual commands:**

```bash
# Run linter
cd server
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format all code
npm run format

# Skip pre-commit hooks (ONLY in emergencies)
git commit -m "message" --no-verify
```

**When to skip hooks:**

⚠️ **ONLY skip hooks in emergencies:**
- Critical production hotfix needed immediately
- Pre-commit script has a bug
- Working with generated/external code

**Never skip for:**
- "I'll fix it later"
- Linting errors you don't want to fix
- To save time

---

## Making Changes

### How to Add New Socket.IO Events

**Example**: Adding a "user is drawing" indicator

**Step 1: Server handler** (`server/index.js`)
```javascript
// Inside io.on('connection', (socket) => { ... })

socket.on('drawing start', (data) => {
  socket.broadcast.emit('drawing start', {
    username: socket.username,
    userId: socket.id
  });
});

socket.on('drawing end', () => {
  socket.broadcast.emit('drawing end', { userId: socket.id });
});
```

**Step 2: Client emitter** (`client/public/app.js`)
```javascript
// In whiteboard section
function onMouseDown(e) {
  drawing = true;
  socket.emit('drawing start');
  // ... rest of function
}

function onMouseUp(e) {
  if (!drawing) return;
  drawing = false;
  socket.emit('drawing end');
}
```

**Step 3: Client listener** (`client/public/app.js`)
```javascript
socket.on('drawing start', (data) => {
  const indicator = document.createElement('div');
  indicator.id = 'drawing-' + data.userId;
  indicator.textContent = `${data.username} is drawing...`;
  indicator.className = 'drawing-indicator';
  document.querySelector('.whiteboard-section').appendChild(indicator);
});

socket.on('drawing end', (data) => {
  const indicator = document.getElementById('drawing-' + data.userId);
  if (indicator) indicator.remove();
});
```

**Step 4: Test with multiple clients**

**Step 5: Commit and push**
```bash
git add server/index.js client/public/app.js
git commit -m "feat: Add drawing activity indicator"
git push origin main
```

### How to Add New UI Features

**Example**: Adding a "Mute All" button

**Step 1: HTML** (`client/public/index.html`)
```html
<button class="btn-mute-all" id="btn-mute-all">Mute All</button>
```

**Step 2: CSS** (`client/public/style.css`)
```css
.btn-mute-all {
  width: 100%;
  padding: 10px;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 10px;
  transition: background 0.3s;
}

.btn-mute-all:hover {
  background: #c82333;
}
```

**Step 3: JavaScript** (`client/public/app.js`)
```javascript
const muteAllBtn = document.getElementById('btn-mute-all');
let isMuted = false;

muteAllBtn.addEventListener('click', () => {
  isMuted = !isMuted;
  mainAudio.muted = isMuted;
  muteAllBtn.textContent = isMuted ? 'Unmute' : 'Mute All';
});
```

**Step 4: Test and commit**
```bash
git add client/public/
git commit -m "feat: Add mute all button"
git push origin main
```

---

## What NOT to Do

### ❌ Security Warnings

**DON'T commit secrets or .env files**
```bash
# BAD - exposed credentials
git add .env
git commit -m "Add config"

# GOOD - .env already in .gitignore
# Verify before committing:
git status
```

**DON'T trust client input without sanitization**
```javascript
// CURRENT: escapeHtml() used for chat messages ✓
// MAINTAIN THIS when adding new features

// BAD
messageEl.innerHTML = userInput;  // XSS risk

// GOOD
messageEl.textContent = userInput;  // Safe
messageEl.innerHTML = escapeHtml(userInput);  // Safe
```

**DON'T expose sensitive endpoints**
```javascript
// CURRENT RISK: Anyone can access /uploads/filename
// TODO: Add authentication or rate limiting
```

### ❌ Code Quality Warnings

**DON'T push untested code**
```bash
# BAD
git add .
git commit -m "Quick fix"
git push  # Untested code now in production!

# GOOD
git add .
git commit -m "Fix audio sync bug"
# Test locally with multiple clients
# Verify fix works
git push origin main
```

**DON'T break WebSocket event contracts**
```javascript
// BAD - changing event data breaks existing clients
// OLD: socket.emit('new message', messageText);
socket.emit('new message', { text: messageText, timestamp: Date.now() });
// Breaks listeners expecting string, not object

// GOOD - add new event, maintain compatibility
socket.emit('new message v2', { text, timestamp });
// Keep old event working until all clients update
```

**DON'T modify state without broadcasting**
```javascript
// BAD - server state out of sync with clients
currentPlayback.playing = false;

// GOOD - always broadcast state changes
currentPlayback.playing = false;
socket.broadcast.emit('pause audio', { currentTime: 0 });
```

### ❌ Deployment Warnings

**DON'T deploy without backing up**
```bash
# Before deploying major changes
git add .
git commit -m "feat: [description]"
git tag v1.0.backup-$(date +%Y%m%d)
git push origin main
git push origin --tags
# Now safe to deploy
```

**DON'T ignore error logs**
```javascript
// BAD - silent failures
mainAudio.play();

// GOOD - handle errors
mainAudio.play().catch(e => {
  console.error('Playback blocked:', e);
  addSystemMessage('Auto-play blocked. Click play button.');
});
```

---

## Deployment

### Pre-Deployment Checklist

- [ ] All changes tested locally with multiple users
- [ ] Git committed with descriptive message
- [ ] **Pushed to GitHub** ⚠️
- [ ] Created git tag for current version
- [ ] Port 3000 open in GCP firewall
- [ ] Server dependencies installed
- [ ] `client/uploads/` directory exists

### Deploy to Production (GCP VM)

**Current setup**: GCP Debian VM at 34.171.102.29

```bash
# 1. Connect to server
ssh your-username@34.171.102.29

# 2. Navigate to project
cd live-dj-room

# 3. Pull latest changes
git pull origin main

# 4. Install dependencies (if package.json changed)
cd server
npm install
cd ..

# 5. Stop existing server
lsof -ti:3000 | xargs kill

# 6. Start new server
./start-server.sh

# 7. Verify deployment
curl -I http://localhost:3000
# Should return HTTP/1.1 200 OK
```

### How to Rollback

```bash
# Find commit hash
git log --oneline

# Revert to specific commit
git checkout <commit-hash>

# Restart server
./start-server.sh
```

### Monitoring

```bash
# Check if server is running
lsof -i:3000

# View server logs
# (logs appear in terminal where npm start was run)

# Check for crashes
journalctl -u node --since "1 hour ago"
```

---

## Troubleshooting

### Port 3000 Already in Use

```bash
# Kill process using port
lsof -ti:3000 | xargs kill

# Or find and kill manually
lsof -i:3000
kill -9 <PID>
```

### nvm Command Not Found

```bash
# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20

# Permanent fix: Add to ~/.bashrc
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
```

### Microphone Not Working

**Solutions**:
1. Check browser permissions (chrome://settings/content/microphone)
2. Ensure microphone connected
3. HTTPS required for getUserMedia (use localhost or https://)

### Audio Files Not Playing

**Solutions**:
1. Click play button manually (auto-play may be blocked)
2. Enable auto-play in browser settings
3. Check browser console for errors

### Whiteboard Not Syncing

**Debug**:
```javascript
// Check if drawing events are being sent
socket.onAny((event, ...args) => console.log(event, args));

// Verify canvas size matches
console.log('Canvas:', canvas.width, canvas.height);
```

### Socket.IO Connection Fails

**Solutions**:
1. Check server is running: `curl http://localhost:3000`
2. Check firewall (remote): Ensure port 3000 open
3. Check browser console for errors
4. Verify Socket.IO versions match

### Server Crashes

**Immediate response**:
```bash
# Check if still running
lsof -i:3000

# Restart
./start-server.sh

# Check recent git commits
git log --oneline -5
# Was it working before last change?

# If needed, rollback
git checkout <previous-commit-hash>
./start-server.sh
```

---

## Contributing Guidelines

### Testing Requirements

**Before committing any change**:
- [ ] Server starts without errors
- [ ] Can login and enter room
- [ ] Feature works in 2+ browser windows simultaneously
- [ ] No console errors
- [ ] Existing features still work (regression test)

**Feature-specific tests**:

**Chat**:
- [ ] Messages send and appear for all users
- [ ] Typing indicators appear/disappear
- [ ] HTML is escaped (try `<script>alert('xss')</script>`)

**Whiteboard**:
- [ ] Drawing appears for all users
- [ ] Coordinates correct on different screen sizes
- [ ] Colors work
- [ ] Clear canvas works

**Audio**:
- [ ] Upload succeeds
- [ ] File appears in playlist for all
- [ ] Play/pause/seek syncs
- [ ] Late joiners catch up

**Voice**:
- [ ] Microphone permissions granted
- [ ] Button activates
- [ ] Voice heard by others
- [ ] Indicator shows who's talking

### Documentation Requirements

**When adding a feature**:
1. Update this DEVELOPER.md with new event names and data flows
2. Update README.md if user-facing
3. Update CLAUDE.md if architecture changes
4. Add inline comments for complex logic

### Pull Request Checklist

```markdown
## Description
[Brief description of changes]

## Testing
- [ ] Tested locally with 2+ users
- [ ] No console errors
- [ ] Existing features still work

## Checklist
- [ ] Code follows project conventions
- [ ] Commit messages are descriptive
- [ ] Documentation updated
- [ ] **Pushed to GitHub** ⚠️
```

---

## Appendix

### Complete Socket.IO Event Reference

**Server → Client** (11 events):
```javascript
'login'           // { numUsers }
'user joined'     // { username, numUsers }
'user left'       // { username, numUsers }
'new message'     // { username, message }
'typing'          // { username }
'stop typing'     // { username }
'drawing'         // { x0, y0, x1, y1, color }
'clear canvas'    // (no data)
'new audio'       // { filename, originalName, url, size }
'play audio'      // { url }
'pause audio'     // { currentTime }
'seek audio'      // { currentTime }
'stop audio'      // (no data)
'sync playback'   // { url, playing, currentTime, startedAt }
'voice start'     // { userId, username }
'voice data'      // { userId, audioData: Uint8Array }
'voice end'       // { userId }
```

**Client → Server** (13 events):
```javascript
'add user'        // username: string
'new message'     // message: string
'typing'          // (no data)
'stop typing'     // (no data)
'drawing'         // { x0, y0, x1, y1, color }
'clear canvas'    // (no data)
'play audio'      // { url }
'pause audio'     // { currentTime }
'seek audio'      // { currentTime }
'stop audio'      // (no data)
'voice start'     // (no data)
'voice data'      // audioData: Uint8Array
'voice end'       // (no data)
```

### File Size Limits

- **Audio uploads**: 50 MB (server/index.js line 36)
- **Voice chunks**: Browser-dependent (typically 1-5 seconds)
- **Username**: 14 characters (index.html line 14)
- **Chat messages**: No limit (consider adding)

### Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| WebSocket | ✓ | ✓ | ✓ | ✓ |
| MediaRecorder | ✓ | ✓ | ⚠️ Limited | ✓ |
| getUserMedia | ✓ | ✓ | ✓ | ✓ |
| Canvas API | ✓ | ✓ | ✓ | ✓ |

### Useful Resources

- **Socket.IO**: https://socket.io/docs/v4/
- **Express**: https://expressjs.com/
- **Multer**: https://github.com/expressjs/multer
- **MediaRecorder API**: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- **Canvas API**: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API

---

## Emergency Contacts & Reminders

### ⚠️ REMEMBER TO:

1. **COMMIT OFTEN** - Create checkpoints before major changes
2. **PUSH TO GITHUB** - Your only backup if VM fails
3. **TEST WITH MULTIPLE USERS** - Open 2+ browser windows
4. **ESCAPE USER INPUT** - Always sanitize for XSS
5. **BROADCAST STATE CHANGES** - Keep all clients in sync
6. **TAG BEFORE DEPLOY** - Create rollback points

### Quick Reference Commands

```bash
# Start development
cd server && npm run dev

# Test locally
# Open http://localhost:3000 in multiple windows

# Commit workflow
git add .
git commit -m "type: description"
git push origin main  # ⚠️ DON'T FORGET THIS

# Deploy to production
ssh user@34.171.102.29
cd live-dj-room && git pull && ./start-server.sh

# Emergency rollback
git log --oneline
git checkout <previous-commit>
./start-server.sh
```

---

**Last Updated**: 2025-11-14
**Maintainer**: Latticeworks1
**Repository**: https://github.com/Latticeworks1/live-dj-room
