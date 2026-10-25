import { Notification } from '../models';
import { logger } from '../logger';

export class NotificationService {
  /**
   * Logs simulated email to server console and optionally stores in-app notification.
   */
  static async sendEmail(to: string, subject: string, body: string): Promise<void> {
    logger.info(
      {
        channel: 'EMAIL (SIMULATED)',
        to,
        subject,
        body,
      },
      `[SIMULATED EMAIL] To: ${to} | Subject: ${subject}`,
    );
  }

  /**
   * Logs simulated SMS/OTP to server console.
   */
  static async sendSms(to: string, message: string): Promise<void> {
    const match = message.match(/\b\d{6}\b/);
    const code = match ? match[0] : '';
    console.log('\n======================================================');
    console.log(`[SIMULATED SMS] To: ${to}`);
    console.log(`Message: ${message}`);
    if (code) {
      console.log(`>>> VERIFICATION OTP CODE: ${code} <<<`);
    }
    console.log('======================================================\n');

    logger.info(
      {
        channel: 'SMS (SIMULATED)',
        to,
        message,
      },
      `[SIMULATED SMS] To: ${to} | Message: ${message}`,
    );
  }

  /**
   * Creates an in-app notification stored in MongoDB.
   */
  static async createInApp(userId: string, title: string, message: string, type = 'info') {
    return Notification.create({
      userId,
      title,
      message,
      type,
    });
  }
}
