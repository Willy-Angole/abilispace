/**
 * Email Service
 * 
 * Handles email sending for password reset and notifications.
 * Uses Nodemailer for SMTP-based email delivery.
 * 
 * @author Shiriki Team
 * @version 1.0.0
 */

import nodemailer from 'nodemailer';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

/**
 * Email template data interface
 */
interface EmailTemplateData {
    recipientName: string;
    code: string;
    expiryMinutes: number;
}

/**
 * EmailService - Handles email operations
 * 
 * Design Pattern: Service Layer pattern
 * Separates email business logic from other services
 */
export class EmailService {
    private transporter: nodemailer.Transporter;
    private isConfigured: boolean;

    constructor() {
        // Check if SMTP is configured
        this.isConfigured = !!(config.smtp.user && config.smtp.password && config.smtp.host);
        
        if (!this.isConfigured) {
            logger.warn('Email service not configured. Missing SMTP credentials.', {
                hasHost: !!config.smtp.host,
                hasUser: !!config.smtp.user,
                hasPassword: !!config.smtp.password,
                hasFrom: !!config.smtp.from,
            });
        }

        // Create reusable transporter with better Titan Email settings
        this.transporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.secure, // true for 465, false for other ports
            auth: {
                user: config.smtp.user,
                pass: config.smtp.password,
            },
            // Additional settings for better compatibility
            tls: {
                rejectUnauthorized: false, // Accept self-signed certificates
            },
            connectionTimeout: 10000, // 10 second timeout
            greetingTimeout: 10000,
            socketTimeout: 15000,
        });

        logger.info('Email transporter initialized', {
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.secure,
            user: config.smtp.user ? config.smtp.user.substring(0, 5) + '***' : 'NOT SET',
            from: config.smtp.from,
        });
    }

    /**
     * Verify SMTP connection
     * Call this on startup to ensure email service is configured correctly
     */
    async verifyConnection(): Promise<boolean> {
        if (!this.isConfigured) {
            logger.warn('Skipping email verification - SMTP not configured');
            return false;
        }

        try {
            await this.transporter.verify();
            logger.info('Email service connected successfully to ' + config.smtp.host);
            return true;
        } catch (error: any) {
            logger.error('Email service connection failed', { 
                error: error.message,
                code: error.code,
                host: config.smtp.host,
                port: config.smtp.port,
            });
            return false;
        }
    }

    /**
     * Send password reset code email
     * 
     * @param to - Recipient email address
     * @param data - Template data including reset code
     */
    async sendPasswordResetCode(
        to: string,
        data: EmailTemplateData
    ): Promise<boolean> {
        const { recipientName, code, expiryMinutes } = data;

        const subject = 'Abilispace - Password Reset Code';
        
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
        }
        .code-box {
            background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
            color: white;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            text-align: center;
            padding: 20px 30px;
            border-radius: 8px;
            margin: 30px 0;
        }
        .message {
            text-align: center;
            margin-bottom: 20px;
        }
        .expiry-notice {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 12px 16px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
        }
        .security-notice {
            background-color: #fee2e2;
            border: 1px solid #fecaca;
            padding: 12px 16px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 13px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">✨ Abilispace</div>
            <p>Inclusive Community Platform</p>
        </div>
        
        <div class="message">
            <h2>Password Reset Request</h2>
            <p>Hello ${recipientName},</p>
            <p>You requested to reset your password. Use the verification code below:</p>
        </div>
        
        <div class="code-box" role="text" aria-label="Your verification code is ${code}">
            ${code}
        </div>
        
        <div class="expiry-notice">
            <strong>⏰ This code expires in ${expiryMinutes} minutes.</strong>
        </div>
        
        <div class="security-notice">
            <strong>🔒 Security Notice:</strong> If you didn't request this password reset, 
            please ignore this email. Your account is safe, and no changes will be made.
        </div>
        
        <div class="footer">
            <p>This is an automated message from Abilispace.</p>
            <p>Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
        `.trim();

        const textContent = `
Abilispace - Password Reset Code

Hello ${recipientName},

You requested to reset your password. Use this verification code:

${code}

This code expires in ${expiryMinutes} minutes.

Security Notice: If you didn't request this password reset, please ignore this email. 
Your account is safe, and no changes will be made.

---
This is an automated message from Abilispace.
        `.trim();

        try {
            const info = await this.transporter.sendMail({
                from: `"Abilispace" <${config.smtp.from}>`,
                to,
                subject,
                text: textContent,
                html: htmlContent,
            });

            logger.info('Password reset email sent', { 
                messageId: info.messageId,
                to: to.substring(0, 3) + '***' // Log partial email for privacy
            });

            return true;
        } catch (error: any) {
            logger.error('Failed to send password reset email', { 
                error: error.message,
                code: error.code,
                command: error.command,
                responseCode: error.responseCode,
                to: to.substring(0, 3) + '***',
                smtpHost: config.smtp.host,
                smtpPort: config.smtp.port,
            });
            return false;
        }
    }

    /**
     * Send password reset confirmation email
     * 
     * @param to - Recipient email address
     * @param recipientName - User's name
     */
    async sendPasswordResetConfirmation(
        to: string,
        recipientName: string
    ): Promise<boolean> {
        const subject = 'Abilispace - Password Successfully Reset';
        
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Confirmation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: #ffffff;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
        }
        .success-icon {
            font-size: 48px;
            text-align: center;
            margin: 20px 0;
        }
        .message {
            text-align: center;
            margin-bottom: 20px;
        }
        .security-notice {
            background-color: #fee2e2;
            border: 1px solid #fecaca;
            padding: 12px 16px;
            border-radius: 8px;
            margin-top: 20px;
            font-size: 13px;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">✨ Abilispace</div>
            <p>Inclusive Community Platform</p>
        </div>
        
        <div class="success-icon">✅</div>
        
        <div class="message">
            <h2>Password Successfully Reset</h2>
            <p>Hello ${recipientName},</p>
            <p>Your password has been successfully reset. You can now sign in with your new password.</p>
        </div>
        
        <div class="security-notice">
            <strong>🔒 Security Notice:</strong> If you didn't make this change, 
            please contact our support team immediately.
        </div>
        
        <div class="footer">
            <p>This is an automated message from Abilispace.</p>
            <p>Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
        `.trim();

        const textContent = `
Abilispace - Password Successfully Reset

Hello ${recipientName},

Your password has been successfully reset. You can now sign in with your new password.

Security Notice: If you didn't make this change, please contact our support team immediately.

---
This is an automated message from Abilispace.
        `.trim();

        try {
            const info = await this.transporter.sendMail({
                from: `"Abilispace" <${config.smtp.from}>`,
                to,
                subject,
                text: textContent,
                html: htmlContent,
            });

            logger.info('Password reset confirmation email sent', { 
                messageId: info.messageId 
            });

            return true;
        } catch (error) {
            logger.error('Failed to send password reset confirmation email', { error });
            return false;
        }
    }
}

// Export singleton instance
export const emailService = new EmailService();
