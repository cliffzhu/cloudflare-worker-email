# Cloudflare Worker Email Module

A reusable email service module for Cloudflare Workers that supports both text and HTML emails via SMTP with STARTTLS authentication.

## Deploy to Cloudflare Workers

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cliffzhu/cloudflare-worker-email)

## Features

- ✅ **SMTP with STARTTLS** - Secure email transmission
- ✅ **HTML & Text Support** - Send both plain text and HTML emails
- ✅ **Reusable Module** - Import and use in other workers
- ✅ **TypeScript Support** - Full type definitions
- ✅ **Connection Testing** - Automatic reachability checks
- ✅ **Office 365 Compatible** - Works with Office 365 SMTP
- ✅ **Flexible API** - Both REST API and function calls
- ✅ **API Authentication** - Secure REST API with AUTH_CODE protection

## Quick Start

### 1. Import the Module

```typescript
import { sendEmail, EmailConfig, SMTPConfig } from './email-worker';
```

### 2. Configure Environment Variables

Set these environment variables in your worker:

```toml
# wrangler.toml
[vars]
SMTP_HOST = "smtp.office365.com"
SMTP_PORT = "587"
SMTP_USERNAME = "your-email@domain.com"

# Set via wrangler secret
# wrangler secret put SMTP_PASSWORD
# wrangler secret put AUTH_CODE
```

### 3. Send an Email

```typescript
const result = await sendEmail({
  to: 'recipient@example.com',
  subject: 'Hello from Worker!',
  body: 'This is a test email.',
  isHtml: false
}, env);

console.log(result); // { success: true, message: "Email sent successfully to recipient@example.com" }
```

## API Reference

### EmailConfig Interface

```typescript
interface EmailConfig {
  to: string;              // Recipient email address
  subject: string;         // Email subject
  body: string;            // Email body (text or HTML)
  isHtml?: boolean;        // Whether body is HTML (default: false)
  from?: {
    email?: string;        // Sender email (defaults to SMTP_USERNAME)
    name?: string;         // Sender name (default: "Notification")
  };
}
```

### SMTPConfig Interface

```typescript
interface SMTPConfig {
  SMTP_HOST?: string;      // SMTP server (default: smtp.office365.com)
  SMTP_PORT?: string;      // SMTP port (default: 587)
  SMTP_USERNAME?: string;  // SMTP username
  SMTP_PASSWORD: string;   // SMTP password (required)
  TO_EMAIL?: string;       // Default recipient for fallback
  AUTH_CODE: string;       // Required authentication code for API access
}
```

## Usage Examples

### Send HTML Email

```typescript
await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to our service!',
  body: `
    <div style="font-family: Arial, sans-serif;">
      <h1 style="color: #333;">Welcome!</h1>
      <p>Thank you for joining us.</p>
      <a href="https://example.com" style="background: #007cba; color: white; padding: 10px 20px; text-decoration: none;">
        Get Started
      </a>
    </div>
  `,
  isHtml: true,
  from: {
    name: 'Welcome Team',
    email: 'welcome@company.com'
  }
}, env);
```

### Send Bulk Emails

```typescript
const recipients = ['user1@example.com', 'user2@example.com'];
const results = await Promise.all(
  recipients.map(email => 
    sendEmail({
      to: email,
      subject: 'Bulk Notification',
      body: `Hello ${email}, this is a bulk email!`,
      isHtml: false
    }, env)
  )
);
```

### Form Submission Handler

```typescript
export async function handleContactForm(formData: any, env: SMTPConfig) {
  return await sendEmail({
    to: 'support@company.com',
    subject: `Contact Form: ${formData.subject}`,
    body: `
      <h2>New Contact Form Submission</h2>
      <table border="1" cellpadding="10">
        <tr><td><strong>Name:</strong></td><td>${formData.name}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${formData.email}</td></tr>
        <tr><td><strong>Message:</strong></td><td>${formData.message}</td></tr>
      </table>
    `,
    isHtml: true
  }, env);
}
```

## REST API Usage

The module provides a REST API when deployed as a worker. **Authentication is required** using the AUTH_CODE.

**Note:** Only POST requests are supported for security reasons.

### POST Request (Send Email)
```bash
curl -X POST https://your-worker.workers.dev \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_CODE" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Custom Email",
    "body": "<h1>Hello!</h1><p>This is HTML content.</p>",
    "isHtml": true,
    "from": {
      "name": "Sender Name",
      "email": "sender@example.com"
    }
  }'
```

## Error Handling

The `sendEmail` function returns a result object:

```typescript
// Success
{
  success: true,
  message: "Email sent successfully to recipient@example.com"
}

// Error
{
  success: false,
  error: "SMTP server unreachable: Connection timeout"
}
```

## API Authentication

When using the REST API, authentication is required using the AUTH_CODE:

### Setting up AUTH_CODE

1. **Generate a secure random string** for your AUTH_CODE:
   ```bash
   # Example: generate a random 32-character string
   openssl rand -hex 32
   ```

2. **Set it as a secret in your worker:**
   ```bash
   wrangler secret put AUTH_CODE
   # Enter your generated AUTH_CODE when prompted
   ```

3. **Include it in all API requests:**
   ```bash
   curl -H "Authorization: Bearer YOUR_AUTH_CODE" https://your-worker.workers.dev
   ```

### Authentication Errors

- **401 Unauthorized**: Missing or invalid AUTH_CODE
- **403 Forbidden**: AUTH_CODE doesn't match environment variable

## Deployment

### Option 1: One-Click Deployment

Click the "Deploy to Cloudflare Workers" button above for instant deployment:

1. **Click the deploy button** - Opens Cloudflare Workers deploy interface
2. **Connect your GitHub account** - If not already connected
3. **Configure environment variables:**
   - `SMTP_USERNAME`: Your email address (e.g., `your-email@domain.com`)
   - `TO_EMAIL`: Default recipient email (optional)
4. **Set secrets after deployment:**
   ```bash
   wrangler secret put SMTP_PASSWORD
   wrangler secret put AUTH_CODE
   ```

### Option 2: Manual Deployment

1. **Install dependencies:**
   ```bash
   npm install @cloudflare/workers-types
   ```

2. **Configure wrangler.toml:**
   ```toml
   name = "email-service"
   main = "src/email-worker.ts"
   compatibility_date = "2024-07-25"
   compatibility_flags = ["nodejs_compat"]

   [vars]
   SMTP_HOST = "smtp.office365.com"
   SMTP_PORT = "587"
   SMTP_USERNAME = "your-email@domain.com"
   ```

3. **Set secrets:**
   ```bash
   wrangler secret put SMTP_PASSWORD
   wrangler secret put AUTH_CODE
   ```

4. **Deploy:**
   ```bash
   wrangler deploy
   ```

## Requirements

- Cloudflare Workers with TCP sockets support
- SMTP server with STARTTLS support (Office 365, Gmail, etc.)
- Valid SMTP credentials

**Office 365 Specific Requirements:**
- Ensure the user account is excluded from MFA-required Conditional Access policies, and generate app-specific password
- Ensure SMTP Authentication is enabled in Exchange Online

## Security Notes

- Always use environment variables for credentials
- Use `wrangler secret put` for passwords and AUTH_CODE
- Validate email addresses before sending
- Consider rate limiting for production use
- Keep your AUTH_CODE secret and rotate it regularly
- The AUTH_CODE protects your email service from unauthorized access

## Troubleshooting

### Common Issues

1. **"SMTP server unreachable"**
   - Check SMTP_HOST and SMTP_PORT settings
   - Verify network connectivity

2. **"Authentication failed"**
   - Verify SMTP_USERNAME and SMTP_PASSWORD
   - Check if account requires app-specific passwords
   - **For Office 365**: Ensure the user account is excluded from MFA-required Conditional Access policies, and generate app-specific password

3. **"Authorization header is required"**
   - Include `Authorization: Bearer YOUR_AUTH_CODE` header in API requests
   - Verify AUTH_CODE is set correctly in environment

4. **"SendAsDenied"**
   - Use the authenticated email as the sender
   - Or configure proper delegation in your email system

5. **"No response from server"**
   - Server might not support STARTTLS
   - Try different SMTP settings

## License

This module is provided as-is for educational and development purposes.
