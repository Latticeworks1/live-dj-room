# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Live DJ Room is a real-time multiplayer web application combining synchronized audio playback, push-to-talk voice chat, collaborative whiteboard, and text chat. Built with Socket.IO for WebSocket communication.

## Quick Start Checklist (First-Time Setup)

**For brand new developers** who have never used this repository or GitHub:

- [ ] **Install Git** on your computer
- [ ] **Create GitHub account** (if you don't have one)
- [ ] **Generate SSH key** for GitHub authentication
- [ ] **Add SSH key to GitHub** account
- [ ] **Clone this repository** using SSH
- [ ] **Install nvm** (Node Version Manager)
- [ ] **Install Node.js 20** via nvm
- [ ] **Install server dependencies**: `cd server && npm install`
- [ ] **Verify pre-commit hooks** are installed (happens automatically)
- [ ] **Configure git** user name and email
- [ ] **Start the server**: `npm start`
- [ ] **Test in browser**: Open http://localhost:3000
- [ ] **Make a test commit** to verify hooks work
- [ ] **Push to GitHub** to backup your changes

**See detailed instructions below** ↓

---

## First-Time Developer Setup (Complete Guide)

This section is for **brand new developers** who have never worked with this repository or may be new to GitHub entirely.

### Step 1: Install Git

**Check if Git is already installed:**
```bash
git --version
# If you see a version number, Git is installed ✓
```

**If not installed:**
- **Mac**: `brew install git` or download from https://git-scm.com/
- **Linux**: `sudo apt-get install git` (Ubuntu/Debian) or `sudo yum install git` (CentOS/RHEL)
- **Windows**: Download from https://git-scm.com/download/win

### Step 2: Create a GitHub Account

1. Go to https://github.com/
2. Click "Sign up"
3. Follow the steps to create your account
4. Verify your email address

### Step 3: Generate SSH Key (IMPORTANT!)

**Why?** SSH keys allow you to connect to GitHub without typing your password every time.

**Generate the key:**
```bash
# Create SSH key (press Enter to accept defaults)
ssh-keygen -t ed25519 -C "your_email@example.com"

# When prompted:
# - File location: Press Enter (uses default: ~/.ssh/id_ed25519)
# - Passphrase: Press Enter twice (or set a password if you want)

# View your PUBLIC key (you'll need this next)
cat ~/.ssh/id_ed25519.pub
```

**You should see output like:**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB... your_email@example.com
```

**Copy the entire output** (from `ssh-ed25519` to your email).

### Step 4: Add SSH Key to GitHub

1. **Go to GitHub Settings**: https://github.com/settings/keys
2. **Click "New SSH key"** (green button)
3. **Title**: Enter something like "My Dev Machine" or "Work Laptop"
4. **Key**: Paste the SSH key you copied (entire line starting with `ssh-ed25519`)
5. **Click "Add SSH key"**

**Test the connection:**
```bash
ssh -T git@github.com

# You should see:
# Hi YourUsername! You've successfully authenticated, but GitHub does not provide shell access.
```

If you see "Permission denied", your SSH key is not set up correctly. Repeat steps 3-4.

### Step 5: Clone the Repository

**Using SSH (recommended):**
```bash
# Clone the repository
git clone git@github.com:Latticeworks1/live-dj-room.git

# Navigate into the directory
cd live-dj-room
```

**If clone fails with "Permission denied":**
- Your SSH key is not set up correctly
- Go back to Steps 3-4 and verify
- Make sure you copied the ENTIRE public key

**Alternative: HTTPS clone** (requires GitHub password/token):
```bash
# Only use if SSH doesn't work
git clone https://github.com/Latticeworks1/live-dj-room.git
```

### Step 6: Install nvm (Node Version Manager)

**Why nvm?** This project requires Node.js 20. nvm lets you easily install and switch between Node.js versions.

**Mac/Linux:**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload your shell configuration
source ~/.bashrc  # or ~/.zshrc on Mac

# Verify nvm is installed
nvm --version
```

**Windows:**
Download nvm-windows from: https://github.com/coreybutler/nvm-windows/releases

**If "nvm command not found":**
```bash
# Add to your shell config (~/.bashrc or ~/.zshrc)
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Then reload:
source ~/.bashrc
```

### Step 7: Install Node.js 20

```bash
# Install Node.js version 20
nvm install 20

# Use Node.js 20
nvm use 20

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x or higher
```

### Step 8: Install Project Dependencies

```bash
# Make sure you're in the project directory
cd live-dj-room

# Navigate to server directory
cd server

# Install all dependencies
# This includes: express, socket.io, multer, nodemon, husky, eslint, prettier
npm install

# You should see:
# - "added XX packages" message
# - Husky hooks automatically installed
```

**What gets installed:**
- **Production dependencies**: Express, Socket.IO, Multer
- **Development tools**: Nodemon (auto-reload)
- **Code quality**: ESLint (linting), Prettier (formatting)
- **Git hooks**: Husky (pre-commit hooks), lint-staged
- **Security**: eslint-plugin-security

### Step 9: Configure Git (First Time Only)

**Set your name and email** (appears in commit history):
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify configuration
git config --global user.name
git config --global user.email
```

### Step 10: Start the Server (First Run)

```bash
# Make sure you're in the server directory
cd server

# Start the server
npm start

# You should see:
# Live DJ Room server listening on port 3000
# Local: http://localhost:3000
```

**If you see "Port 3000 already in use":**
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill

# Try starting again
npm start
```

### Step 11: Test in Browser

1. **Open your browser**
2. **Go to**: http://localhost:3000
3. **Enter a username**
4. **You should see the Live DJ Room interface**

**Test multi-user features:**
1. Open a second browser window/tab
2. Go to http://localhost:3000 again
3. Enter a different username
4. Try chatting between windows - messages should appear in both

**If something doesn't work:**
- Check the server terminal for error messages
- Check the browser console (F12) for JavaScript errors
- See "Troubleshooting" section below

### Step 12: Understanding Pre-Commit Hooks

**What are pre-commit hooks?** Automatic checks that run BEFORE every git commit to catch issues early.

**This project automatically checks:**
1. ✅ Removes emojis from code files
2. ✅ Scans for secrets (API keys, passwords)
3. ✅ Runs ESLint to check code quality
4. ✅ Formats code with Prettier
5. ✅ Validates Socket.IO event names
6. ✅ Warns about large files (>500 lines)
7. ✅ Prevents committing .env files

**Test that hooks are working:**
```bash
# Create a test file
echo "console.log('test');" > server/test-file.js

# Stage and commit
git add server/test-file.js
git commit -m "test: Testing pre-commit hooks"

# You should see:
# 🔍 Running pre-commit checks...
# ✅ All pre-commit checks passed!
```

**If hooks DON'T run:**
```bash
# Reinstall hooks
cd server
npm install

# Or manually:
cd ..
git config core.hooksPath .husky
```

### Step 13: Make Your First Real Commit

**Basic Git Workflow:**
```bash
# 1. Check what you changed
git status

# 2. Stage files you want to commit
git add <filename>
# Or stage everything:
git add .

# 3. Commit with a descriptive message
git commit -m "type: Brief description of changes"

# Examples:
# git commit -m "feat: Add new audio control feature"
# git commit -m "fix: Correct whiteboard coordinate bug"
# git commit -m "docs: Update setup instructions"

# 4. Push to GitHub (backup your work!)
git push origin main
```

**Commit message types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code restructuring
- `style:` Formatting changes
- `test:` Adding tests
- `chore:` Maintenance tasks

### Congratulations! 🎉

You're now set up and ready to develop!

**Next steps:**
- Read the "Architecture" section below to understand how the code works
- See "Making Changes" section for how to add features
- See "Git and GitHub Basics" section if you're new to Git
- Check out DEVELOPER.md for more detailed development guide

---

## Git and GitHub Basics (For New Developers)

**New to Git/GitHub?** This section explains the basics.

### What is Git vs GitHub?

**Git** = Version control software on YOUR computer
- Tracks changes to your code
- Like "Save As" but way more powerful
- Works offline
- Keeps history of all changes

**GitHub** = Online service for backing up and sharing code
- Like Dropbox/Google Drive for code
- Backs up your Git history to the cloud
- Lets teams collaborate
- NOT the same as Git!

**Analogy:**
- Git = Microsoft Word (saves on your computer)
- GitHub = Google Docs (online backup and sharing)

### Why We Use Both

1. **Git (Local)**: You make changes, save them locally
2. **GitHub (Remote)**: You push your local changes to GitHub for backup
3. **Your Team**: They pull your changes from GitHub to their computers

**Critical:** If you only use Git (local), and your computer crashes, your code is GONE. Always push to GitHub!

### The Git Workflow (Step by Step)

**Daily workflow:**

```bash
# MORNING: Get latest changes from team
git pull origin main

# WORK: Make your changes to files...
# Edit code, add features, fix bugs

# CHECK: See what you changed
git status
# Shows files you modified (in red)

git diff
# Shows exact line-by-line changes

# STAGE: Tell Git which files to save
git add filename.js          # Add specific file
git add server/index.js      # Add file in subdirectory
git add .                    # Add ALL changed files (careful!)

# Check staging area
git status
# Now files are green (staged and ready)

# COMMIT: Save changes to LOCAL Git history
git commit -m "feat: Add volume control"

# Pre-commit hooks run automatically here
# If they pass, commit succeeds
# If they fail, fix the issues and commit again

# BACKUP: Push to GitHub (IMPORTANT!)
git push origin main
```

### Common Git Commands Explained

**Checking status:**
```bash
git status
# Shows:
# - Files you changed (red = unstaged, green = staged)
# - Current branch
# - Whether you're ahead/behind GitHub
```

**Viewing history:**
```bash
git log
# Shows all commits (newest first)
# Press 'q' to exit

git log --oneline
# Shorter view (one line per commit)

git log --oneline -10
# Last 10 commits
```

**Seeing exact changes:**
```bash
git diff
# Shows unstaged changes (what you just edited)

git diff --staged
# Shows staged changes (what you added)

git diff HEAD~1
# Compare with previous commit
```

**Undoing changes:**
```bash
# Undo changes to a file (NOT YET COMMITTED)
git restore filename.js
# ⚠️ This DELETES your unsaved changes!

# Unstage a file (keep changes, just unstage)
git restore --staged filename.js

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (DELETE changes) ⚠️ DANGEROUS
git reset --hard HEAD~1
```

**Pulling latest changes:**
```bash
git pull origin main
# Gets latest code from GitHub
# Merges it with your local code
```

### What NOT to Do with Git

❌ **DON'T commit without testing first**
```bash
# BAD
git add .
git commit -m "quick fix"
git push
# You just pushed broken code to everyone!

# GOOD
# 1. Make changes
# 2. Test the changes work
# 3. Commit
# 4. Push
```

❌ **DON'T use `git add .` without checking what you're adding**
```bash
# BAD
git add .  # Might add unwanted files!

# GOOD
git status  # See what changed first
git add server/index.js client/public/app.js  # Add specific files
```

❌ **DON'T commit secrets/passwords**
```bash
# BAD
# File: .env
API_KEY=sk-super-secret-key-12345

git add .env
git commit -m "Add config"
# ⚠️ Secret is now in Git history FOREVER!

# GOOD
# .env is in .gitignore (never committed)
# Use .env.example with fake values instead
```

❌ **DON'T skip pre-commit hooks without good reason**
```bash
# BAD (unless emergency)
git commit -m "fix" --no-verify
# Skips all quality checks!

# GOOD
git commit -m "fix: Correct audio sync bug"
# Lets hooks run and catch issues
```

❌ **DON'T forget to push**
```bash
# BAD
git commit -m "Important work"
# ... computer crashes ...
# Your work is GONE! Never pushed to GitHub.

# GOOD
git commit -m "Important work"
git push origin main  # ✅ Backed up to GitHub
```

### Understanding Pre-Commit Hooks

**What happens when you commit:**

```bash
git commit -m "feat: Add feature"

# 1. Pre-commit hooks run automatically
🔍 Running pre-commit checks...
⚠️  Checking for emojis...
⚠️  Scanning for secrets...
⚠️  Running ESLint...
⚠️  Formatting with Prettier...

# 2. If ALL pass:
✅ All pre-commit checks passed!
[main abc123] feat: Add feature
 2 files changed, 10 insertions(+)

# 3. If ANY fail:
❌ [index.js] SECURITY: Potential API Key detected!
❌ Pre-commit checks FAILED - fix errors above

# Commit is BLOCKED until you fix the issues
```

**What to do if hooks fail:**

```bash
# Read the error message carefully
# Fix the issue it's complaining about
# Try committing again

# Example: If eslint fails
npm run lint:fix  # Auto-fix linting issues
git add .
git commit -m "feat: Add feature"  # Try again
```

**When to skip hooks (RARE):**
```bash
# ONLY in emergencies:
# - Production is down and you need to push a hotfix NOW
# - Pre-commit script itself has a bug
# - You're committing external/generated code

git commit -m "hotfix: Critical bug" --no-verify
```

### Getting Help

**If you're stuck:**

1. **Check git status**
   ```bash
   git status
   # Usually tells you what's wrong and how to fix it
   ```

2. **Read error messages carefully**
   - Git errors are usually helpful
   - They often tell you the exact command to fix the issue

3. **Google the error message**
   - Copy/paste the error into Google
   - Very common errors have well-known solutions

4. **Check DEVELOPER.md**
   - More detailed troubleshooting guide
   - Common issues and solutions

5. **Ask the team**
   - Don't struggle alone!
   - Post in your team chat

---

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

**Quick Start (from project root):**
```bash
./start-server.sh     # Loads nvm and starts server
```

### Access
- **Local**: http://localhost:3000
- **Public Domain**: http://lyricai.latticeworks-ai.com:3000
- **Public IP**: http://34.171.102.29:3000
- **Uploaded files**: http://localhost:3000/uploads/

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
- **Domain**: lyricai.latticeworks-ai.com
- **Public IP**: 34.171.102.29
- **Port**: 3000
- **Public URLs**:
  - http://lyricai.latticeworks-ai.com:3000 (domain)
  - http://34.171.102.29:3000 (direct IP)
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
- **Status**: Check `DOMAIN-STATUS.md` for current firewall status

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

### Troubleshooting

**Port already in use:**
```bash
# Kill existing Node.js processes
pkill -f "node index.js"

# Or find and kill specific process on port 3000
lsof -ti:3000 | xargs kill
```

**Check if server is running:**
```bash
ps aux | grep node          # Check Node.js processes
netstat -tlnp | grep 3000   # Check port 3000 status
```

**Test public access:**
```bash
./verify-access.sh          # Run comprehensive access tests
# Or manually:
curl -I http://lyricai.latticeworks-ai.com:3000
```

**nvm command not found:**
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20
```

### Production Considerations
- Add HTTPS/SSL for secure connections (voice/audio requires secure context in browsers)
- Domain configured: lyricai.latticeworks-ai.com (see `DOMAIN-STATUS.md`)
- Use process manager (PM2) for auto-restart
- Configure nginx as reverse proxy
- Add rate limiting to prevent abuse
- Implement user authentication
