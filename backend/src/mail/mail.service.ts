import { Injectable, Logger } from '@nestjs/common';

/**
 * Outbound mail is logged to the API process (visible in Render logs).
 * The platform does not use an external SMTP provider.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    this.logger.warn(`[mail] Password reset for ${to}: ${resetUrl}`);
  }

  async sendWelcome(
    to: string,
    firstName: string,
    temporaryPassword: string,
  ): Promise<void> {
    this.logger.warn(
      `[mail] Welcome for ${to} (${firstName}); temporary password: ${temporaryPassword}`,
    );
  }
}
