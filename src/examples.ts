// Example: How to use the email service in other workers
// 
// Note: These examples show direct function usage, which doesn't require AUTH_CODE.
// AUTH_CODE is only required when using the REST API endpoints.

import { sendEmail, EmailConfig, SMTPConfig } from './email-worker';

// Example worker that uses the email service
export default {
  async fetch(request: Request, env: SMTPConfig): Promise<Response> {
    try {
      // Example 1: Send a simple text email
      const textEmailResult = await sendEmail({
        to: 'user@example.com',
        subject: 'Welcome to our service!',
        body: 'Thank you for signing up. We are excited to have you on board!',
        isHtml: false,
        from: {
          name: 'Welcome Team',
          email: 'welcome@company.com'
        }
      }, env);

      // Example 2: Send an HTML email
      const htmlEmailResult = await sendEmail({
        to: 'user@example.com',
        subject: 'Your Order Confirmation',
        body: `
          <html>
            <body>
              <h1>Order Confirmation</h1>
              <p>Thank you for your order!</p>
              <table border="1">
                <tr>
                  <th>Item</th>
                  <th>Price</th>
                </tr>
                <tr>
                  <td>Product A</td>
                  <td>$29.99</td>
                </tr>
              </table>
              <p><strong>Total: $29.99</strong></p>
            </body>
          </html>
        `,
        isHtml: true,
        from: {
          name: 'Order System',
          email: 'orders@company.com'
        }
      }, env);

      // Example 3: Send multiple emails
      const recipients = ['user1@example.com', 'user2@example.com', 'user3@example.com'];
      const emailResults = await Promise.all(
        recipients.map(recipient => 
          sendEmail({
            to: recipient,
            subject: 'Bulk Notification',
            body: `<h2>Hello!</h2><p>This is a bulk notification sent to ${recipient}</p>`,
            isHtml: true
          }, env)
        )
      );

      return new Response(JSON.stringify({
        textEmail: textEmailResult,
        htmlEmail: htmlEmailResult,
        bulkEmails: emailResults
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: any) {
      return new Response(JSON.stringify({
        error: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

// Example usage in a service worker or scheduled event
export async function sendWelcomeEmail(userEmail: string, userName: string, env: SMTPConfig) {
  return await sendEmail({
    to: userEmail,
    subject: 'Welcome to our platform!',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Welcome ${userName}!</h1>
        <p>We're excited to have you join our platform.</p>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
          <h3>Getting Started:</h3>
          <ul>
            <li>Complete your profile</li>
            <li>Explore our features</li>
            <li>Join our community</li>
          </ul>
        </div>
        <p>If you have any questions, feel free to reach out!</p>
        <p>Best regards,<br>The Team</p>
      </div>
    `,
    isHtml: true,
    from: {
      name: 'Welcome Team',
      email: 'welcome@company.com'
    }
  }, env);
}

// Example usage in a form submission handler
export async function sendContactFormEmail(formData: any, env: SMTPConfig) {
  return await sendEmail({
    to: 'support@company.com',
    subject: `New Contact Form Submission from ${formData.name}`,
    body: `
      <h2>New Contact Form Submission</h2>
      <table border="1" cellpadding="10">
        <tr><td><strong>Name:</strong></td><td>${formData.name}</td></tr>
        <tr><td><strong>Email:</strong></td><td>${formData.email}</td></tr>
        <tr><td><strong>Subject:</strong></td><td>${formData.subject}</td></tr>
        <tr><td><strong>Message:</strong></td><td>${formData.message}</td></tr>
        <tr><td><strong>Submitted:</strong></td><td>${new Date().toISOString()}</td></tr>
      </table>
    `,
    isHtml: true,
    from: {
      name: 'Contact Form',
      email: 'noreply@company.com'
    }
  }, env);
}

// Example: REST API usage with AUTH_CODE authentication
// When deploying the email-worker as a standalone service, clients would call it like this:
/*
// JavaScript/TypeScript client example:
async function sendEmailViaAPI(emailData, authCode) {
  const response = await fetch('https://your-email-worker.workers.dev', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authCode}`
    },
    body: JSON.stringify(emailData)
  });
  
  return await response.json();
}

// Usage:
const result = await sendEmailViaAPI({
  to: 'user@example.com',
  subject: 'Hello from API',
  body: '<h1>Hello!</h1><p>This was sent via REST API</p>',
  isHtml: true
}, 'YOUR_AUTH_CODE');
*/
