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

  configurationStatus(): { ok: boolean; provider: string } {
    const endpoint = this.config.get<string>('MAIL_DELIVERY_URL')?.trim();
    const healthEndpoint = this.config.get<string>('MAIL_DELIVERY_HEALTH_URL')?.trim();
    if ((!endpoint || !healthEndpoint) && this.config.get<string>('NODE_ENV') === 'production') {
      return { ok: false, provider: 'unconfigured' };
    }
    return { ok: true, provider: endpoint ? 'https-webhook' : 'development-suppressed' };
  }

  async availabilityStatus(): Promise<{ ok: boolean; provider: string }> {
    const configured = this.configurationStatus();
    if (!configured.ok) return configured;
    const endpoint = this.config.get<string>('MAIL_DELIVERY_HEALTH_URL')?.trim();
    if (!endpoint) return configured;
    const token = this.config.get<string>('MAIL_DELIVERY_TOKEN')?.trim();
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(`Mail provider health returned ${response.status}`);
    }
    return { ok: true, provider: 'https-webhook' };
  }

  private async deliver(
    to: string,
    template: 'password-reset' | 'account-activation',
    actionUrl: string,
  ): Promise<{ providerMessageId?: string }> {
    const endpoint = this.config.get<string>('MAIL_DELIVERY_URL')?.trim();
    const token = this.config.get<string>('MAIL_DELIVERY_TOKEN')?.trim();
    if (!endpoint) {
      if (this.config.get<string>('NODE_ENV') === 'production') {
        throw new ServiceUnavailableException('Outbound mail is not configured');
      }
      this.logger.log(`[mail] ${template} delivery suppressed for ${to}`);
      return { providerMessageId: 'development-suppressed' };
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
    let providerMessageId = response.headers.get('x-message-id') ?? undefined;
    if (!providerMessageId) {
      try {
        const body = (await response.json()) as { id?: unknown; messageId?: unknown };
        const candidate = body.messageId ?? body.id;
        if (typeof candidate === 'string') providerMessageId = candidate.slice(0, 255);
      } catch {
        // A successful provider is not required to return JSON.
      }
    }
    return { providerMessageId };
  }

  async sendPasswordReset(to: string, resetUrl: string) {
    return this.deliver(to, 'password-reset', resetUrl);
  }

  async sendActivation(to: string, activationUrl: string) {
    return this.deliver(to, 'account-activation', activationUrl);
  }
}
