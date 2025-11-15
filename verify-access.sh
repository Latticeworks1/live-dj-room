#!/bin/bash

echo "========================================="
echo "Live DJ Room - Public Access Verification"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PUBLIC_IP="34.171.102.29"
DOMAIN="lyricai.latticeworks-ai.com"
PORT="3000"

echo "Testing server access..."
echo ""

# Test 1: Local server running
echo -n "1. Local server running: "
if ps aux | grep -q "[n]ode index.js"; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL - Server not running${NC}"
    echo "   Run: cd /home/latticeworks225/live-dj-room && ./start-server.sh"
    exit 1
fi

# Test 2: Port listening
echo -n "2. Port 3000 listening: "
if netstat -tln 2>/dev/null | grep -q ":3000 " || ss -tln | grep -q ":3000 "; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    exit 1
fi

# Test 3: Local access
echo -n "3. Local HTTP access: "
if curl -s -f http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
else
    echo -e "${RED}✗ FAIL${NC}"
    exit 1
fi

# Test 4: Public port open
echo -n "4. Public port 3000: "
if timeout 3 bash -c "cat < /dev/null > /dev/tcp/$PUBLIC_IP/$PORT" 2>/dev/null; then
    echo -e "${GREEN}✓ OPEN${NC}"
    FIREWALL_OPEN=true
else
    echo -e "${RED}✗ BLOCKED${NC}"
    FIREWALL_OPEN=false
fi

# Test 5: Public HTTP access
echo -n "5. Public HTTP access: "
if [ "$FIREWALL_OPEN" = true ]; then
    if curl -s -f -m 5 http://$PUBLIC_IP:$PORT > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
    else
        echo -e "${YELLOW}⚠ WARNING - Firewall open but HTTP not responding${NC}"
    fi
else
    echo -e "${RED}✗ BLOCKED BY FIREWALL${NC}"
fi

echo ""
echo "========================================="
echo "Summary:"
echo "========================================="

if [ "$FIREWALL_OPEN" = true ]; then
    echo -e "${GREEN}SUCCESS!${NC} Your Live DJ Room is publicly accessible!"
    echo ""
    echo "🎉 Share these URLs with friends:"
    echo "   Domain: https://$DOMAIN"
    echo "   IP:     http://$PUBLIC_IP:$PORT"
    echo ""
    echo "Features available:"
    echo "  ✓ Chat"
    echo "  ✓ Whiteboard"
    echo "  ✓ Audio Player"
    echo "  ✓ Voice Chat (may need HTTPS on some browsers)"
else
    echo -e "${RED}FIREWALL BLOCKING ACCESS${NC}"
    echo ""
    echo "⚠️  Port $PORT is not accessible from the internet."
    echo ""
    echo "To fix this, open port $PORT in GCP Firewall:"
    echo "1. Visit: https://console.cloud.google.com/networking/firewalls/list"
    echo "2. Create a firewall rule:"
    echo "   - Name: allow-live-dj-room"
    echo "   - Direction: Ingress"
    echo "   - Action: Allow"
    echo "   - Source IP ranges: 0.0.0.0/0"
    echo "   - Protocols: TCP port 3000"
    echo ""
    echo "Then run this script again to verify."
fi

echo ""
echo "For more details, see: STATUS.md and FIREWALL-SETUP.md"
