"use strict";
/**
 * Email Service
 *
 * Handles email sending for password reset and notifications.
 * Uses Nodemailer for SMTP-based email delivery.
 *
 * @author Shiriki Team
 * @version 1.0.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const environment_1 = require("../config/environment");
const logger_1 = require("../utils/logger");
/**
 * EmailService - Handles email operations
 *
 * Design Pattern: Service Layer pattern
 * Separates email business logic from other services
 */
class EmailService {
    transporter;
    constructor() {
        // Create reusable transporter
        this.transporter = nodemailer_1.default.createTransport({
            host: environment_1.config.smtp.host,
            port: environment_1.config.smtp.port,
            secure: environment_1.config.smtp.secure, // true for 465, false for other ports
            auth: {
                user: environment_1.config.smtp.user,
                pass: environment_1.config.smtp.password,
            },
        });
    }
    /**
     * Verify SMTP connection
     * Call this on startup to ensure email service is configured correctly
     */
    async verifyConnection() {
        try {
            await this.transporter.verify();
            logger_1.logger.info('Email service connected successfully');
            return true;
        }
        catch (error) {
            logger_1.logger.error('Email service connection failed', { error });
            return false;
        }
    }
    /**
     * Send password reset code email
     *
     * @param to - Recipient email address
     * @param data - Template data including reset code
     */
    async sendPasswordResetCode(to, data) {
        const { recipientName, code, expiryMinutes } = data;
        const subject = 'Shiriki - Password Reset Code';
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
            <div class="logo">🤝 Shiriki</div>
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
            <p>This is an automated message from Shiriki.</p>
            <p>Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
        `.trim();
        const textContent = `
Shiriki - Password Reset Code

Hello ${recipientName},

You requested to reset your password. Use this verification code:

${code}

This code expires in ${expiryMinutes} minutes.

Security Notice: If you didn't request this password reset, please ignore this email. 
Your account is safe, and no changes will be made.

---
This is an automated message from Shiriki.
        `.trim();
        try {
            const info = await this.transporter.sendMail({
                from: `"Shiriki" <${environment_1.config.smtp.from}>`,
                to,
                subject,
                text: textContent,
                html: htmlContent,
            });
            logger_1.logger.info('Password reset email sent', {
                messageId: info.messageId,
                to: to.substring(0, 3) + '***' // Log partial email for privacy
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to send password reset email', { error, to });
            return false;
        }
    }
    /**
     * Send password reset confirmation email
     *
     * @param to - Recipient email address
     * @param recipientName - User's name
     */
    async sendPasswordResetConfirmation(to, recipientName) {
        const subject = 'Shiriki - Password Successfully Reset';
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
            <div class="logo">🤝 Shiriki</div>
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
            <p>This is an automated message from Shiriki.</p>
            <p>Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
        `.trim();
        const textContent = `
Shiriki - Password Successfully Reset

Hello ${recipientName},

Your password has been successfully reset. You can now sign in with your new password.

Security Notice: If you didn't make this change, please contact our support team immediately.

---
This is an automated message from Shiriki.
        `.trim();
        try {
            const info = await this.transporter.sendMail({
                from: `"Shiriki" <${environment_1.config.smtp.from}>`,
                to,
                subject,
                text: textContent,
                html: htmlContent,
            });
            logger_1.logger.info('Password reset confirmation email sent', {
                messageId: info.messageId
            });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to send password reset confirmation email', { error });
            return false;
        }
    }
}
exports.EmailService = EmailService;
// Export singleton instance
exports.emailService = new EmailService();
//# sourceMappingURL=email.service.js.map