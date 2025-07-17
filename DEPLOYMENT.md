# Deployment Script for Cloudflare Worker Email Service

## Prerequisites
1. Install wrangler CLI: `npm install -g wrangler`
2. Login to Cloudflare: `wrangler login`

## Setup
1. Update `wrangler.toml` with your configuration
2. Generate a secure AUTH_CODE:
   ```bash
   # Generate a random 32-character string (recommended)
   openssl rand -hex 32
   ```
3. Set environment variables:
   ```bash
   wrangler secret put SMTP_PASSWORD
   wrangler secret put AUTH_CODE
   ```

## Deploy
```bash
wrangler deploy
```

## Test
```bash
# Test with POST request (only method supported)
curl -X POST https://your-worker.workers.dev \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_CODE" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Test Email",
    "body": "<h1>Hello World!</h1>",
    "isHtml": true
  }'
```
