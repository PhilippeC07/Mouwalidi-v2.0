import { Injectable, Logger } from '@nestjs/common';

export interface WhatsappSendResult {
  success: boolean;
  error?: string;
}

// Sends free-form text via Meta's WhatsApp Cloud API. Meta only allows
// free-form text to a customer who has messaged the business within the last
// 24 hours — a cold broadcast to customers outside that window needs a
// pre-approved message template instead (see Meta Business Manager). If
// broadcast sends start failing with a "re-engagement"/template error, that's
// why — this service only implements the free-form path.
@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  private get apiVersion() {
    return process.env.WHATSAPP_API_VERSION || 'v21.0';
  }

  private get phoneNumberId() {
    return process.env.WHATSAPP_PHONE_NUMBER_ID;
  }

  private get accessToken() {
    return process.env.WHATSAPP_ACCESS_TOKEN;
  }

  private get defaultCountryCode() {
    return process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '961';
  }

  isConfigured(): boolean {
    return Boolean(this.phoneNumberId && this.accessToken);
  }

  /** Strips formatting punctuation and prepends the default country code for local numbers. */
  normalizePhoneNumber(raw: string): string {
    const digits = raw.replace(/\D/g, '').replace(/^0+/, '');
    return digits.startsWith(this.defaultCountryCode) ? digits : `${this.defaultCountryCode}${digits}`;
  }

  async sendTextMessage(rawPhone: string, message: string): Promise<WhatsappSendResult> {
    if (!this.isConfigured()) {
      return { success: false, error: 'WhatsApp API is not configured (missing WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID).' };
    }

    const to = this.normalizePhoneNumber(rawPhone);
    try {
      const res = await fetch(`https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.warn(`WhatsApp send failed for ${to}: ${res.status} ${body}`);
        return { success: false, error: `WhatsApp API error ${res.status}` };
      }
      return { success: true };
    } catch (e) {
      this.logger.error(`WhatsApp send threw for ${to}`, e as Error);
      return { success: false, error: (e as Error).message };
    }
  }
}
