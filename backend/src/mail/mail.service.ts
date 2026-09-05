import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  private provider(): string {
    return (
      this.config.get<string>('MAIL_PROVIDER') ??
      (this.config.get<string>('NODE_ENV') === 'production' ? 'smtp' : 'log')
    )
      .trim()
      .toLowerCase();
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const subject = 'Reset your SkillForge LMS password';
    const text = `Reset your password using this link (expires soon):\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`;
    const html = `<p>Reset your password using this link (expires soon):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, ignore this email.</p>`;

    const provider = this.provider();
    if (provider === 'log') {
      this.logger.warn(`[mail:log] Password reset for ${to}: ${resetUrl}`);
      return;
    }

    if (provider !== 'smtp') {
      throw new BadRequestException(`Unsupported MAIL_PROVIDER: ${provider}`);
    }

    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const from = this.config.get<string>('SMTP_FROM')?.trim();
    if (!host || !from) {
      throw new ServiceUnavailableException(
        'SMTP_HOST and SMTP_FROM must be configured for password reset email',
      );
    }

    const port = Number(this.config.get<string>('SMTP_PORT') ?? '587');
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim();
    const secure =
      (this.config.get<string>('SMTP_SECURE') ?? '').toLowerCase() === 'true' ||
      port === 465;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    this.logger.log(`Password reset email sent to ${to}`);
  }

  async sendWelcome(
    to: string,
    firstName: string,
    temporaryPassword: string,
  ): Promise<void> {
    const subject = 'Your SkillForge LMS account';
    const text = `Hi ${firstName},\n\nAn account was created for you on SkillForge LMS.\n\nTemporary password: ${temporaryPassword}\n\nSign in and change this password immediately.\n`;
    const html = `<p>Hi ${firstName},</p><p>An account was created for you on SkillForge LMS.</p><p>Temporary password: <strong>${temporaryPassword}</strong></p><p>Sign in and change this password immediately.</p>`;
    await this.dispatch(to, subject, text, html, `Welcome email for ${to}`);
  }

  private async dispatch(
    to: string,
    subject: string,
    text: string,
    html: string,
    logLabel: string,
  ): Promise<void> {
    const provider = this.provider();
    if (provider === 'log') {
      this.logger.warn(`[mail:log] ${logLabel}`);
      return;
    }
    if (provider !== 'smtp') {
      throw new BadRequestException(`Unsupported MAIL_PROVIDER: ${provider}`);
    }
    const host = this.config.get<string>('SMTP_HOST')?.trim();
    const from = this.config.get<string>('SMTP_FROM')?.trim();
    if (!host || !from) {
      throw new ServiceUnavailableException(
        'SMTP_HOST and SMTP_FROM must be configured for outbound email',
      );
    }
    const port = Number(this.config.get<string>('SMTP_PORT') ?? '587');
    const user = this.config.get<string>('SMTP_USER')?.trim();
    const pass = this.config.get<string>('SMTP_PASS')?.trim();
    const secure =
      (this.config.get<string>('SMTP_SECURE') ?? '').toLowerCase() === 'true' ||
      port === 465;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
    await transporter.sendMail({ from, to, subject, text, html });
    this.logger.log(logLabel);
  }
}
