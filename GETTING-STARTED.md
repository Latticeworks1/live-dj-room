# Getting Started Guide

Complete setup guide for **brand new developers** who have never worked with this repository or may be new to GitHub entirely.

## Quick Start Checklist

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

---

## Step 1: Install Git

**Check if Git is already installed:**
```bash
git --version
# If you see a version number, Git is installed ✓
```

**If not installed:**
- **Mac**: `brew install git` or download from https://git-scm.com/
- **Linux**: `sudo apt-get install git` (Ubuntu/Debian) or `sudo yum install git` (CentOS/RHEL)
- **Windows**: Download from https://git-scm.com/download/win

## Step 2: Create a GitHub Account

1. Go to https://github.com/
2. Click "Sign up"
3. Follow the steps to create your account
4. Verify your email address

## Step 3: Generate SSH Key

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

## Step 4: Add SSH Key to GitHub

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

## Step 5: Clone the Repository

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

## Step 6: Install nvm (Node Version Manager)

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

## Step 7: Install Node.js 20

```bash
# Install Node.js version 20
nvm install 20

# Use Node.js 20
nvm use 20

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x or higher
```

## Step 8: Install Project Dependencies

```bash
# Make sure you're in the project directory
cd live-dj-room

# Navigate to server directory
cd server

# Install all dependencies
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

## Step 9: Configure Git (First Time Only)

**Set your name and email** (appears in commit history):
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify configuration
git config --global user.name
git config --global user.email
```

## Step 10: Start the Server (First Run)

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

## Step 11: Test in Browser

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
- See DEVELOPER.md "Troubleshooting" section

## Step 12: Understanding Pre-Commit Hooks

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

## Step 13: Make Your First Real Commit

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

## Congratulations! 🎉

You're now set up and ready to develop!

**Next steps:**
- Read GIT-BASICS.md if you're new to Git
- Read CLAUDE.md to understand the architecture
- Check out DEVELOPER.md for detailed development guide
- Start coding!
