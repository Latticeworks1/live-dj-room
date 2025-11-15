#!/bin/bash

echo "========================================="
echo "Live DJ Room - SSL/HTTPS Verification"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

DOMAIN="lyricai.latticeworks-ai.com"
HTTP_PORT="3000"
HTTPS_PORT="443"

# Test 1: Check if SSL certificates exist
echo -n "1. SSL Certificates installed: "
if sudo test -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem && sudo test -f /etc/letsencrypt/live/$DOMAIN/privkey.pem; then
    echo -e "${GREEN}✓ PASS${NC}"
    SSL_INSTALLED=true
else
    echo -e "${RED}✗ FAIL - Certificates not found${NC}"
    echo "   Run: sudo certbot certonly --standalone -d $DOMAIN"
    SSL_INSTALLED=false
fi

# Test 2: Check certificate expiration
if [ "$SSL_INSTALLED" = true ]; then
    echo -n "2. Certificate expiration: "
    EXPIRY=$(sudo openssl x509 -enddate -noout -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem | cut -d= -f2)
    EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

    if [ $DAYS_LEFT -gt 30 ]; then
        echo -e "${GREEN}✓ PASS${NC} ($DAYS_LEFT days remaining)"
    elif [ $DAYS_LEFT -gt 7 ]; then
        echo -e "${YELLOW}⚠ WARNING${NC} ($DAYS_LEFT days remaining - renew soon)"
    else
        echo -e "${RED}✗ FAIL${NC} ($DAYS_LEFT days remaining - RENEW NOW!)"
    fi
fi

# Test 3: Check if server is running
echo -n "3. Server process running: "
if ps aux | grep -q "[n]ode.*index.js"; then
    echo -e "${GREEN}✓ PASS${NC}"
    SERVER_RUNNING=true
else
    echo -e "${RED}✗ FAIL - Server not running${NC}"
    echo "   Start server: cd server && npm start"
    SERVER_RUNNING=false
fi

# Test 4: Check if HTTP port is listening
if [ "$SERVER_RUNNING" = true ]; then
    echo -n "4. HTTP port $HTTP_PORT listening: "
    if netstat -tln 2>/dev/null | grep -q ":$HTTP_PORT " || ss -tln | grep -q ":$HTTP_PORT "; then
        echo -e "${GREEN}✓ PASS${NC}"
    else
        echo -e "${RED}✗ FAIL${NC}"
    fi
fi

# Test 5: Check if HTTPS port is listening
if [ "$SERVER_RUNNING" = true ] && [ "$SSL_INSTALLED" = true ]; then
    echo -n "5. HTTPS port $HTTPS_PORT listening: "
    if sudo netstat -tln 2>/dev/null | grep -q ":$HTTPS_PORT " || sudo ss -tln | grep -q ":$HTTPS_PORT "; then
        echo -e "${GREEN}✓ PASS${NC}"
        HTTPS_LISTENING=true
    else
        echo -e "${YELLOW}⚠ WARNING - Port $HTTPS_PORT not listening${NC}"
        echo "   Server may need to run with sudo to bind to port 443"
        HTTPS_LISTENING=false
    fi
fi

# Test 6: Check firewall - HTTP port
echo -n "6. Firewall - HTTP port $HTTP_PORT: "
if timeout 3 bash -c "cat < /dev/null > /dev/tcp/$DOMAIN/$HTTP_PORT" 2>/dev/null; then
    echo -e "${GREEN}✓ OPEN${NC}"
    HTTP_OPEN=true
else
    echo -e "${RED}✗ BLOCKED${NC}"
    HTTP_OPEN=false
fi

# Test 7: Check firewall - HTTPS port
echo -n "7. Firewall - HTTPS port $HTTPS_PORT: "
if timeout 3 bash -c "cat < /dev/null > /dev/tcp/$DOMAIN/$HTTPS_PORT" 2>/dev/null; then
    echo -e "${GREEN}✓ OPEN${NC}"
    HTTPS_OPEN=true
else
    echo -e "${RED}✗ BLOCKED${NC}"
    HTTPS_OPEN=false
fi

# Test 8: HTTP connection test
if [ "$HTTP_OPEN" = true ]; then
    echo -n "8. HTTP connection test: "
    if curl -s -f -m 5 http://$DOMAIN:$HTTP_PORT > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
    else
        echo -e "${YELLOW}⚠ WARNING - Port open but HTTP not responding${NC}"
    fi
fi

# Test 9: HTTPS connection test
if [ "$HTTPS_OPEN" = true ]; then
    echo -n "9. HTTPS connection test: "
    if curl -s -f -m 5 https://$DOMAIN > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        HTTPS_WORKING=true
    else
        echo -e "${YELLOW}⚠ WARNING - Port open but HTTPS not responding${NC}"
        HTTPS_WORKING=false
    fi
fi

# Test 10: SSL certificate validation
if [ "$HTTPS_WORKING" = true ]; then
    echo -n "10. SSL certificate validation: "
    if curl -s --cacert /etc/ssl/certs/ca-certificates.crt https://$DOMAIN > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS - Valid certificate${NC}"
    else
        echo -e "${YELLOW}⚠ WARNING - Certificate validation issue${NC}"
    fi
fi

echo ""
echo "========================================="
echo "Summary:"
echo "========================================="

if [ "$HTTPS_WORKING" = true ]; then
    echo -e "${GREEN}SUCCESS!${NC} HTTPS is fully configured and working!"
    echo ""
    echo "🎉 Share this URL with friends:"
    echo "   https://$DOMAIN"
    echo ""
    echo "Alternative access:"
    echo "   http://$DOMAIN:$HTTP_PORT"
    echo ""
    echo "Features available:"
    echo "  ✓ Secure HTTPS connection"
    echo "  ✓ Valid SSL certificate"
    echo "  ✓ Multi-room support"
    echo "  ✓ Chat, Whiteboard, Audio, Voice"
elif [ "$SSL_INSTALLED" = false ]; then
    echo -e "${RED}SSL CERTIFICATES NOT INSTALLED${NC}"
    echo ""
    echo "To install SSL certificates:"
    echo "1. Stop the server temporarily:"
    echo "   pkill -f 'node.*index.js'"
    echo ""
    echo "2. Run certbot:"
    echo "   sudo certbot certonly --standalone -d $DOMAIN"
    echo ""
    echo "3. Restart the server:"
    echo "   cd server && sudo npm start"
elif [ "$HTTPS_LISTENING" = false ]; then
    echo -e "${YELLOW}HTTPS PORT NOT LISTENING${NC}"
    echo ""
    echo "Port 443 requires root privileges. Start server with sudo:"
    echo "   cd server && sudo npm start"
elif [ "$HTTPS_OPEN" = false ]; then
    echo -e "${RED}FIREWALL BLOCKING HTTPS PORT${NC}"
    echo ""
    echo "To open port $HTTPS_PORT in GCP Firewall:"
    echo "1. Visit: https://console.cloud.google.com/networking/firewalls/list"
    echo "2. Create a firewall rule:"
    echo "   - Name: allow-https"
    echo "   - Direction: Ingress"
    echo "   - Action: Allow"
    echo "   - Source IP ranges: 0.0.0.0/0"
    echo "   - Protocols: TCP port 443"
else
    echo -e "${YELLOW}HTTPS PARTIALLY CONFIGURED${NC}"
    echo ""
    echo "Some tests failed. Check the output above for details."
fi

echo ""
echo "For more details, see: DOMAIN-STATUS.md"
echo ""
