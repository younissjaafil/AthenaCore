import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  tags?: { name: string; value: string }[];
}

@Injectable()
export class ResendService {
  private readonly logger = new Logger(ResendService.name);
  private resend: Resend;
  private readonly fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    this.resend = new Resend(apiKey);
    this.fromEmail =
      this.configService.get<string>('RESEND_FROM_EMAIL') ||
      'noreply@athena.ai';

    this.logger.log('Resend service initialized');
  }

  async sendEmail(options: SendEmailOptions): Promise<{
    success: boolean;
    resendId?: string;
    error?: string;
  }> {
    try {
      const recipient = Array.isArray(options.to) ? options.to[0] : options.to;

      const { data, error } = await this.resend.emails.send({
        from: options.from || this.fromEmail,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        tags: options.tags,
      });

      if (error) {
        this.logger.error(
          `Failed to send email to ${recipient}: ${error.message}`,
          error,
        );
        return {
          success: false,
          error: error.message,
        };
      }

      this.logger.log(`Email sent successfully to ${recipient}: ${data.id}`);
      return {
        success: true,
        resendId: data.id,
      };
    } catch (error) {
      const recipient = Array.isArray(options.to) ? options.to[0] : options.to;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(
        `Unexpected error sending email to ${recipient}`,
        error,
      );
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async sendBulkEmails(
    emails: SendEmailOptions[],
  ): Promise<
    { success: boolean; resendId?: string; error?: string; to: string }[]
  > {
    const results = await Promise.allSettled(
      emails.map((email) => this.sendEmail(email)),
    );

    return results.map((result, index) => {
      const to = Array.isArray(emails[index].to)
        ? emails[index].to[0]
        : emails[index].to;

      if (result.status === 'fulfilled') {
        return { ...result.value, to };
      } else {
        const errorMessage =
          result.reason instanceof Error
            ? result.reason.message
            : 'Unknown error';
        return {
          success: false,
          error: errorMessage,
          to,
        };
      }
    });
  }
}
