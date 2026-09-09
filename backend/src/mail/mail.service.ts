import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Outbound mail is delivered through a configured HTTPS provider. Secret-bearing
 * links are deliberately never written to logs.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  private async deliver(
    to: string,
    template: 'password-reset' | 'account-activation',
    actionUrl: string,
  ): Promise<void> {
    const endpoint = this.config.get<string>('MAIL_DELIVERY_URL')?.trim();
    const token = this.config.get<string>('MAIL_DELIVERY_TOKEN')?.trim();
    if (!endpoint) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new ServiceUnavailableException('Outbound mail is not configured');
      }
      this.logger.log(`[mail] ${template} delivery suppressed for ${to}`);
      return;
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ to, template, actionUrl }),
    });
    if (!response.ok) {
      this.logger.error(`[mail] ${template} delivery failed for ${to} (${response.status})`);
      throw new ServiceUnavailableException('Outbound mail delivery failed');
    }
    this.logger.log(`[mail] ${template} delivered to ${to}`);
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.deliver(to, 'password-reset', resetUrl);
  }

  async sendActivation(to: string, activationUrl: string): Promise<void> {
    await this.deliver(to, 'account-activation', activationUrl);
  }
}
