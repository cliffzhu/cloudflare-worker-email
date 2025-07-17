import { connect } from 'cloudflare:sockets';

// SMTP response codes
const SMTP_READY = '220';
const SMTP_OK = '250';
const SMTP_AUTH_SUCCESS = '235';
const SMTP_START_INPUT = '354';
const SMTP_AUTH_CONTINUE = '334';

// Email configuration interface
export interface EmailConfig {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  from?: {
    email?: string;
    name?: string;
  };
}

// SMTP environment configuration
export interface SMTPConfig {
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USERNAME?: string;
  SMTP_PASSWORD: string;
  TO_EMAIL?: string; // For default fallback
  AUTH_CODE: string; // Required authentication code for API access
}

// Main email sending function
export async function sendEmail(emailConfig: EmailConfig, env: SMTPConfig): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Get SMTP configuration from environment
    const SMTP_HOST = env.SMTP_HOST || 'smtp.office365.com';
    const SMTP_PORT = parseInt(env.SMTP_PORT || '587');
    const SMTP_USERNAME = env.SMTP_USERNAME || '';
    const FROM_EMAIL = emailConfig.from?.email || SMTP_USERNAME;
    const FROM_NAME = emailConfig.from?.name || 'Notification';
    const TO_EMAIL = emailConfig.to;
    const SUBJECT = emailConfig.subject;
    const EMAIL_BODY = emailConfig.body;
    const IS_HTML = emailConfig.isHtml || false;
    const SMTP_PASSWORD = env.SMTP_PASSWORD;
    
    if (!SMTP_PASSWORD) {
      throw new Error('SMTP_PASSWORD environment variable is not set');
    }

    if (!SMTP_USERNAME) {
      throw new Error('SMTP_USERNAME environment variable is not set');
    }

    if (!TO_EMAIL || !SUBJECT || !EMAIL_BODY) {
      throw new Error('Missing required email parameters: to, subject, and body are required');
    }

    // Step 0: Check SMTP server reachability
    console.log('Checking SMTP server reachability...');
    try {
      const testSocket = connect({
        hostname: SMTP_HOST,
        port: SMTP_PORT
      });
      
      // Wait for the connection to be established
      await testSocket.opened;
      console.log('SMTP server is reachable');
      
      // Close the test socket immediately after confirming connection
      await testSocket.close();
      console.log('Test connection closed');
    } catch (error: any) {
      throw new Error(`SMTP server unreachable: ${error.message}`);
    }

    console.log('Starting SMTP connection to:', SMTP_HOST, 'port:', SMTP_PORT);
    // Create TCP connection to SMTP server
    const socket = connect({
      hostname: SMTP_HOST, 
      port: SMTP_PORT
    }, {
      secureTransport: 'starttls',
      allowHalfOpen: false
    });
    
    console.log('Socket created with STARTTLS support');

    // Wait for connection to establish
    await socket.opened;

    const writer = socket.writable.getWriter();
    const reader = socket.readable.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper function to read SMTP response
    async function readResponse(): Promise<string> {
      const { value } = await reader.read();
      if (!value) {
        throw new Error('No response from server');
      }
      const response = decoder.decode(value);
      console.log('SMTP Response:', response.trim());
      return response.trim();
    }

    // Helper function to send SMTP command
    async function sendCommand(command: string): Promise<void> {
      console.log('SMTP Command:', command);
      await writer.write(encoder.encode(command + '\r\n'));
    }

    // Step 1: Read initial server greeting
    let response = await readResponse();
    if (!response.startsWith(SMTP_READY)) {
      throw new Error(`SMTP server not ready: ${response}`);
    }

    // Step 2: Send EHLO command
    await sendCommand(`EHLO ${SMTP_HOST}`);
    response = await readResponse();
    if (!response.startsWith(SMTP_OK)) {
      throw new Error(`EHLO failed: ${response}`);
    }

    // Step 3: Upgrade to TLS
    await sendCommand('STARTTLS');
    response = await readResponse();
    if (!response.startsWith(SMTP_READY)) {
      throw new Error(`STARTTLS failed: ${response}`);
    }

    console.log('Upgrading to TLS...');
    
    // Release the original reader and writer before upgrading
    try {
      writer.releaseLock();
    } catch (e) {
      console.log('Writer release error (expected):', e);
    }
    
    try {
      reader.releaseLock();
    } catch (e) {
      console.log('Reader release error (expected):', e);
    }
    
    // Upgrade the socket to use TLS
    const secureSocket = socket.startTls();
    
    // Wait for TLS connection to be established
    await secureSocket.opened;
    console.log('TLS upgrade successful - socket is now secure');

    // Get new reader/writer for secure socket
    const secureWriter = secureSocket.writable.getWriter();
    const secureReader = secureSocket.readable.getReader();

    // Helper functions for secure socket
    async function readSecureResponse(): Promise<string> {
      const { value } = await secureReader.read();
      if (!value) {
        throw new Error('No secure response from server');
      }
      const response = decoder.decode(value);
      console.log('Secure SMTP Response:', response.trim());
      return response.trim();
    }

    async function sendSecureCommand(command: string): Promise<void> {
      console.log('Secure SMTP Command:', command);
      await secureWriter.write(encoder.encode(command + '\r\n'));
    }

    // Step 4: Send EHLO again after TLS upgrade
    await sendSecureCommand(`EHLO ${SMTP_HOST}`);
    response = await readSecureResponse();
    if (!response.startsWith(SMTP_OK)) {
      throw new Error(`Secure EHLO failed: ${response}`);
    }

    // Step 5: Authenticate
    console.log('Starting authentication...');
    
    await sendSecureCommand('AUTH LOGIN');
    response = await readSecureResponse();
    if (!response.startsWith(SMTP_AUTH_CONTINUE)) {
      throw new Error(`AUTH LOGIN failed: ${response}`);
    }

    // Send base64 encoded username
    console.log('Sending username...');
    const base64Username = btoa(SMTP_USERNAME);
    await sendSecureCommand(base64Username);
    response = await readSecureResponse();
    if (!response.startsWith(SMTP_AUTH_CONTINUE)) {
      throw new Error(`Username authentication failed: ${response}`);
    }

    // Send base64 encoded password
    console.log('Sending password...');
    const base64Password = btoa(SMTP_PASSWORD);
    await sendSecureCommand(base64Password);
    response = await readSecureResponse();
    if (!response.startsWith(SMTP_AUTH_SUCCESS)) {
      throw new Error(`Password authentication failed: ${response}`);
    }
    console.log('Authentication successful!');

    // Step 6: Send email
    console.log('Starting email sending process...');
    // MAIL FROM
    await sendSecureCommand(`MAIL FROM:<${FROM_EMAIL}>`);
    response = await readSecureResponse();
    if (!response.startsWith(SMTP_OK)) {
      throw new Error(`MAIL FROM failed: ${response}`);
    }
    console.log('MAIL FROM successful');

    // RCPT TO
    await sendSecureCommand(`RCPT TO:<${TO_EMAIL}>`);
    response = await readSecureResponse();
    if (!response.startsWith(SMTP_OK)) {
      throw new Error(`RCPT TO failed: ${response}`);
    }
    console.log('RCPT TO successful');

    // DATA
    await sendSecureCommand('DATA');
    response = await readSecureResponse();
    if (!response.startsWith(SMTP_START_INPUT)) {
      throw new Error(`DATA command failed: ${response}`);
    }
    console.log('DATA command successful, sending email content...');

    // Build email headers
    const emailHeaders = [
      `From: ${FROM_NAME} <${FROM_EMAIL}>`,
      `To: ${TO_EMAIL}`,
      `Subject: ${SUBJECT}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${Date.now()}@${SMTP_HOST}>`,
      'MIME-Version: 1.0'
    ];

    // Add content type based on email format
    if (IS_HTML) {
      emailHeaders.push('Content-Type: text/html; charset=UTF-8');
      emailHeaders.push('Content-Transfer-Encoding: 8bit');
    } else {
      emailHeaders.push('Content-Type: text/plain; charset=UTF-8');
      emailHeaders.push('Content-Transfer-Encoding: 8bit');
    }

    // Send email headers and body
    const emailMessage = [
      ...emailHeaders,
      '',
      EMAIL_BODY,
      '.'
    ].join('\r\n');

    await sendSecureCommand(emailMessage);
    response = await readSecureResponse();
    if (!response.startsWith(SMTP_OK)) {
      throw new Error(`Email sending failed: ${response}`);
    }
    console.log('Email sent successfully!');

    // Step 7: Quit
    await sendSecureCommand('QUIT');
    response = await readSecureResponse();
    console.log('QUIT successful');

    // Close the connection properly
    try {
      await secureWriter.close();
    } catch (e) {
      console.log('Secure writer close error (expected):', e);
    }
    
    try {
      secureReader.cancel();
    } catch (e) {
      console.log('Secure reader cancel error (expected):', e);
    }
    
    try {
      await secureSocket.close();
    } catch (e) {
      console.log('Secure socket close error (expected):', e);
    }
    
    console.log('All connections closed successfully');

    return {
      success: true,
      message: `Email sent successfully to ${TO_EMAIL}`
    };

  } catch (error: any) {
    console.error('SMTP Error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}

// Production Worker fetch handler
export default {
  async fetch(request: Request, env: SMTPConfig): Promise<Response> {
    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Only POST requests are allowed. Please send email configuration in request body.'
      }), {
        status: 405,
        headers: { 
          'Content-Type': 'application/json',
          'Allow': 'POST'
        }
      });
    }

    try {
      // Check for AUTH_CODE in environment
      if (!env.AUTH_CODE) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Authentication not configured. Please contact administrator.'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check for Authorization header
      const authHeader = request.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Authorization header is required. Please provide "Authorization: Bearer YOUR_AUTH_CODE".'
        }), {
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer'
          }
        });
      }

      // Extract the auth code from "Bearer TOKEN" format
      const authCode = authHeader.replace(/^Bearer\s+/i, '');
      if (!authCode || authCode !== env.AUTH_CODE) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid authentication code. Access denied.'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Parse request body for email configuration
      let emailConfig: EmailConfig;
      
      try {
        emailConfig = await request.json();
      } catch {
        return new Response(JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body. Expected EmailConfig object with to, subject, and body fields.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Validate required fields
      if (!emailConfig.to || !emailConfig.subject || !emailConfig.body) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing required fields: to, subject, and body are required in the request body.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Send the email
      const result = await sendEmail(emailConfig, env);

      return new Response(JSON.stringify(result, null, 2), {
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error: any) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }, null, 2), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};