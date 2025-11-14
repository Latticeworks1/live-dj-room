# Firewall Setup for Live DJ Room

Your server is running on **34.171.102.29:3000** but is currently blocked by Google Cloud Platform firewall.

## Option 1: GCP Console (Recommended)

1. Go to https://console.cloud.google.com/networking/firewalls/list
2. Click **"CREATE FIREWALL RULE"**
3. Fill in the details:
   - **Name**: `allow-live-dj-room`
   - **Direction**: Ingress
   - **Action on match**: Allow
   - **Targets**: All instances in the network
   - **Source filter**: IP ranges
   - **Source IP ranges**: `0.0.0.0/0` (allows all IPs)
   - **Protocols and ports**: Check "Specified protocols and ports"
     - **TCP**: `3000`
4. Click **CREATE**

## Option 2: gcloud CLI (If you have permissions)

```bash
gcloud compute firewall-rules create allow-live-dj-room \
  --allow tcp:3000 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow access to Live DJ Room on port 3000"
```

## After Opening the Firewall

Visit: **http://34.171.102.29:3000**

Share this URL with friends to join your Live DJ Room!

## Security Note

Opening port 3000 to `0.0.0.0/0` allows anyone on the internet to access your DJ room.

For production use, consider:
- Adding authentication
- Restricting source IP ranges to specific networks
- Using HTTPS with SSL certificates
- Setting up a domain name
