/**
 * Email Service
 *
 * Handles email sending for password reset and notifications.
 * Uses Nodemailer for SMTP-based email delivery.
 *
 * @author Shiriki Team
 * @version 1.0.0
 */
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
export declare class EmailService {
    private transporter;
    constructor();
    /**
     * Verify SMTP connection
     * Call this on startup to ensure email service is configured correctly
     */
    verifyConnection(): Promise<boolean>;
    /**
     * Send password reset code email
     *
     * @param to - Recipient email address
     * @param data - Template data including reset code
     */
    sendPasswordResetCode(to: string, data: EmailTemplateData): Promise<boolean>;
    /**
     * Send password reset confirmation email
     *
     * @param to - Recipient email address
     * @param recipientName - User's name
     */
    sendPasswordResetConfirmation(to: string, recipientName: string): Promise<boolean>;
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=email.service.d.ts.map