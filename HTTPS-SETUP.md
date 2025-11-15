# HTTPS/SSL Setup Guide

This guide explains how to set up and verify HTTPS for the Live DJ Room application.

## Overview

The Live DJ Room server supports **dual protocol access**:
- **HTTP** on port 3000 (always available)
- **HTTPS** on port 443 (requires SSL certificates)

Socket.IO connections work on both protocols, so clients can connect via either HTTP or HTTPS.

## Prerequisites

- Domain name pointing to your server: `lyricai.latticeworks-ai.com → 34.171.102.29`
- GCP firewall rules allowing ports 443 and 3000
- Root/sudo access (required for port 443 and certificate management)

## SSL Certificates Status

### Check Current Status

```bash
cd /home/latticeworks225/live-dj-room
./verify-ssl.sh
```

This script checks:
1. ✓ SSL certificate installation
2. ✓ Certificate expiration date
3. ✓ Server running status
4. ✓ HTTP/HTTPS ports listening
5. ✓ Firewall configuration
6. ✓ HTTP/HTTPS connectivity
7. ✓ SSL certificate validation

## Server Configuration

### How It Works

The server (`server/index.js`) automatically detects and uses SSL certificates:

```javascript
// 1. Creates HTTP server (always available)
const http = require('http').Server(app);

// 2. Creates Socket.IO instance on HTTP server
const io = socketIo(http, {...});

// 3. Checks for SSL certificates
if (certificates exist) {
  // Creates HTTPS server
  const httpsServer = https.createServer(httpsOptions, app);

  // Attaches Socket.IO to HTTPS server as well
  io.attach(httpsServer);

  // Starts HTTPS server on port 443
  httpsServer.listen(443);
}

// 4. Starts HTTP server on port 3000
http.listen(3000);
```

**Key Points:**
- Single Socket.IO instance handles both HTTP and HTTPS connections
- All event handlers work on both protocols
- Automatic fallback: if SSL certs not found, only HTTP is available
- No code changes needed when adding/removing SSL

### Certificate Paths

The server looks for certificates at:
- **Certificate**: `/etc/letsencrypt/live/lyricai.latticeworks-ai.com/fullchain.pem`
- **Private Key**: `/etc/letsencrypt/live/lyricai.latticeworks-ai.com/privkey.pem`

These are automatically created by Let's Encrypt/Certbot.

## SSL Certificate Management

### Obtaining Certificates (First Time)

If you don't have SSL certificates yet:

```bash
# 1. Stop the server (certbot needs port 80/443)
pkill -f "node.*index.js"

# 2. Run certbot
sudo certbot certonly --standalone -d lyricai.latticeworks-ai.com

# 3. Verify installation
sudo ls -la /etc/letsencrypt/live/lyricai.latticeworks-ai.com/

# You should see:
# - cert.pem -> ../archive/.../cert1.pem
# - chain.pem -> ../archive/.../chain1.pem
# - fullchain.pem -> ../archive/.../fullchain1.pem
# - privkey.pem -> ../archive/.../privkey1.pem

# 4. Build client
cd /home/latticeworks225/live-dj-room/client
npm run build

# 5. Start server with sudo (required for port 443)
cd ../server
sudo npm start
```

### Certificate Renewal

Let's Encrypt certificates expire after **90 days**. Renew them before expiration:

```bash
# Check expiration date
sudo certbot certificates

# Renew certificates (dry run - test first)
sudo certbot renew --dry-run

# Renew certificates (for real)
sudo certbot renew

# Restart server to load new certificates
sudo systemctl restart live-dj-room  # If using systemd
# OR
pkill -f "node.*index.js" && cd /home/latticeworks225/live-dj-room/server && sudo npm start
```

### Automatic Renewal (Recommended)

Set up a cron job to auto-renew:

```bash
# Edit root's crontab
sudo crontab -e

# Add this line (runs twice daily):
0 0,12 * * * certbot renew --quiet --post-hook "systemctl restart live-dj-room"
```

## Firewall Configuration

### Required Firewall Rules

You need **TWO** firewall rules in GCP:

#### Rule 1: HTTP (Port 3000)
```
Name: allow-live-dj-room
Direction: Ingress
Action: Allow
Source IP ranges: 0.0.0.0/0
Protocols: TCP port 3000
```

#### Rule 2: HTTPS (Port 443)
```
Name: allow-https
Direction: Ingress
Action: Allow
Source IP ranges: 0.0.0.0/0
Protocols: TCP port 443
```

### Creating Firewall Rules

1. Visit: [GCP Firewall Rules](https://console.cloud.google.com/networking/firewalls/list)
2. Click **"CREATE FIREWALL RULE"**
3. Enter settings (see above)
4. Click **CREATE**
5. Wait 1-2 minutes for propagation

### Verify Firewall

```bash
# Test HTTP port
curl -I http://lyricai.latticeworks-ai.com:3000

# Test HTTPS port
curl -I https://lyricai.latticeworks-ai.com

# Or use verification script
./verify-ssl.sh
```

## Running the Server

### Development (No SSL)

For local development, SSL is optional:

```bash
cd /home/latticeworks225/live-dj-room/server
npm run dev  # HTTP only on port 3000
```

### Production (With SSL)

For production with HTTPS, run as root:

```bash
# 1. Build client
cd /home/latticeworks225/live-dj-room/client
npm run build

# 2. Start server as root (required for port 443)
cd ../server
sudo npm start
```

**Why sudo?**
- Port 443 is a privileged port (< 1024)
- Only root can bind to privileged ports
- Port 3000 doesn't require sudo, but 443 does

### Using PM2 (Recommended for Production)

PM2 manages the server process and auto-restarts on crashes:

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start server with PM2 as root
cd /home/latticeworks225/live-dj-room/server
sudo pm2 start index.js --name live-dj-room

# Auto-start on server reboot
sudo pm2 startup systemd
sudo pm2 save

# Monitor
sudo pm2 monit

# View logs
sudo pm2 logs live-dj-room

# Restart after code changes
sudo pm2 restart live-dj-room
```

## Access URLs

Once HTTPS is configured:

### Primary URL (HTTPS - Recommended)
```
https://lyricai.latticeworks-ai.com
```

### Alternative URLs
```
http://lyricai.latticeworks-ai.com:3000  (HTTP with port)
http://34.171.102.29:3000                (Direct IP)
```

## Troubleshooting

### Issue: "Port 443 already in use"

```bash
# Find process using port 443
sudo lsof -i :443

# Kill the process
sudo kill <PID>

# Or kill all node processes
sudo pkill -f node
```

### Issue: "Permission denied" on port 443

**Problem:** Non-root user trying to bind to port 443.

**Solution:** Run server with `sudo`:
```bash
cd /home/latticeworks225/live-dj-room/server
sudo npm start
```

### Issue: "SSL certificates not found"

**Problem:** Server can't find certificate files.

**Check:**
```bash
sudo ls -la /etc/letsencrypt/live/lyricai.latticeworks-ai.com/
```

**Solution:** Obtain certificates (see "Obtaining Certificates" section above)

### Issue: HTTPS not working but HTTP works

**Possible causes:**
1. Firewall blocking port 443
2. Server not running with sudo
3. SSL certificates expired

**Debug:**
```bash
# Run full verification
./verify-ssl.sh

# Check server logs
sudo pm2 logs live-dj-room  # If using PM2
# OR
journalctl -u live-dj-room  # If using systemd
```

### Issue: Certificate expired

**Check expiration:**
```bash
sudo certbot certificates
```

**Renew:**
```bash
sudo certbot renew
sudo pm2 restart live-dj-room  # Restart server
```

### Issue: Browser shows "Not Secure" warning

**Possible causes:**
1. Certificate doesn't match domain
2. Certificate expired
3. Mixed content (loading HTTP resources on HTTPS page)

**Check certificate:**
```bash
# View certificate details
curl -vI https://lyricai.latticeworks-ai.com 2>&1 | grep -A 10 "Server certificate"
```

## Security Best Practices

### 1. Use HTTPS for Production

Always use HTTPS in production:
- Encrypts traffic (important for voice/file uploads)
- Required for some browser APIs (microphone access)
- Builds user trust

### 2. Auto-Renewal

Set up auto-renewal to prevent certificate expiration:
```bash
sudo crontab -e
# Add: 0 0,12 * * * certbot renew --quiet --post-hook "pm2 restart live-dj-room"
```

### 3. Redirect HTTP to HTTPS (Optional)

To force HTTPS, add this to `server/index.js`:

```javascript
// Add before app.use(express.static(...))
app.use((req, res, next) => {
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    next();
  } else {
    res.redirect('https://' + req.headers.host + req.url);
  }
});
```

### 4. Keep Certificates Secure

- Never commit certificates to git
- Certificates are stored in `/etc/letsencrypt/` (root-only access)
- Backup certificates securely

## Verification Checklist

Before going live with HTTPS:

- [ ] SSL certificates installed and valid
- [ ] Firewall allows ports 443 and 3000
- [ ] Server running with sudo
- [ ] Both HTTP and HTTPS accessible
- [ ] Socket.IO connects on both protocols
- [ ] Client build exists in `client/dist/`
- [ ] Auto-renewal configured
- [ ] PM2 configured for auto-restart
- [ ] Firewall rules documented
- [ ] Tested from external network

Run verification:
```bash
./verify-ssl.sh
```

## Monitoring

### Check SSL Status

```bash
# Quick check
curl -I https://lyricai.latticeworks-ai.com

# Detailed check
./verify-ssl.sh

# View certificate details
sudo certbot certificates
```

### Check Server Status

```bash
# If using PM2
sudo pm2 status
sudo pm2 logs live-dj-room

# Check ports
sudo netstat -tulpn | grep -E ':(443|3000)'

# Check firewall
curl -I http://lyricai.latticeworks-ai.com:3000
curl -I https://lyricai.latticeworks-ai.com
```

## Additional Resources

- [Certbot Documentation](https://certbot.eff.org/docs/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [GCP Firewall Rules](https://cloud.google.com/firewall/docs/using-firewalls)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)

## Related Documentation

- `README.md` - Project overview
- `DOMAIN-STATUS.md` - Domain configuration
- `FIREWALL-SETUP.md` - Firewall setup
- `verify-ssl.sh` - SSL verification script
- `verify-access.sh` - Access verification script
