#!/bin/bash

# Post-build verification script
# Verifies the public endpoint is accessible after rebuild

echo ""
echo "========================================="
echo " POST-BUILD DEPLOYMENT VERIFICATION"
echo "========================================="
echo ""

PUBLIC_DOMAIN="https://lyricai.latticeworks-ai.com"
PUBLIC_IP="http://34.171.102.29:3000"

echo "Checking public HTTPS domain..."
if curl -f -s -I "$PUBLIC_DOMAIN" > /dev/null; then
  echo "✅ HTTPS domain is accessible: $PUBLIC_DOMAIN"
else
  echo "❌ HTTPS domain is NOT accessible: $PUBLIC_DOMAIN"
  exit 1
fi

echo ""
echo "Checking public IP endpoint..."
if curl -f -s -I "$PUBLIC_IP" > /dev/null; then
  echo "✅ Public IP is accessible: $PUBLIC_IP"
else
  echo "❌ Public IP is NOT accessible: $PUBLIC_IP"
  exit 1
fi

echo ""
echo "Checking bundled assets are being served..."
ASSETS=$(curl -s "$PUBLIC_DOMAIN" | grep -oP '(?<=src=|href=)[^>]+\.js|\.css' | wc -l)
if [ "$ASSETS" -gt 0 ]; then
  echo "✅ Bundled assets detected ($ASSETS files)"
else
  echo "❌ No bundled assets found"
  exit 1
fi

echo ""
echo "========================================="
echo " ✅ DEPLOYMENT VERIFICATION PASSED!"
echo "========================================="
echo ""
echo "🌐 Access your app at:"
echo "   - $PUBLIC_DOMAIN"
echo "   - $PUBLIC_IP"
echo ""
