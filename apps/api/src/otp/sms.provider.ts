/* SMS sending is pluggable. Until the bulk-SMS account exists, the console
   provider logs the message and OTP stays optional (OTP_REQUIRED=false).
   When the provider account is ready, add its implementation here, set
   SMS_PROVIDER=<name> and OTP_REQUIRED=true, and nothing else changes. */

export interface SmsProvider {
  send(phone: string, text: string): Promise<void>;
}

class ConsoleSmsProvider implements SmsProvider {
  async send(phone: string, text: string): Promise<void> {
    console.log(`[sms:console] to=${phone} text=${text}`);
  }
}

export function smsProvider(): SmsProvider {
  const name = process.env.SMS_PROVIDER ?? 'console';
  switch (name) {
    case 'console':
      return new ConsoleSmsProvider();
    /* case 'bulksmsbd': return new BulkSmsBdProvider(); — when the account
       and API key arrive */
    default:
      throw new Error(`Unknown SMS_PROVIDER: ${name}`);
  }
}

export function otpRequired(): boolean {
  return process.env.OTP_REQUIRED === 'true';
}
