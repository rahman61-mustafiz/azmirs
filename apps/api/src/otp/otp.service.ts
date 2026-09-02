import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { createHash, randomInt } from 'node:crypto';
import { supabaseAdmin } from '../supabase.js';
import { otpRequired, smsProvider } from './sms.provider.js';

const OTP_TTL_MINUTES = 5;
const VERIFY_WINDOW_MINUTES = 15;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

const hash = (code: string) => createHash('sha256').update(code).digest('hex');

export const normalizePhone = (phone: string) =>
  phone.replace(/^\+?880/, '0').replace(/^00/, '0');

@Injectable()
export class OtpService {
  config() {
    return { required: otpRequired() };
  }

  async send(rawPhone: string) {
    if (!otpRequired())
      throw new BadRequestException('OTP এখন চালু নেই');
    const phone = normalizePhone(rawPhone);
    if (!/^01[0-9]{9}$/.test(phone))
      throw new BadRequestException('ফোন নম্বরটা ঠিক মনে হচ্ছে না');
    const db = supabaseAdmin();

    const recent = await db
      .from('phone_otps')
      .select('created_at')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (
      recent.data &&
      Date.now() - new Date(recent.data.created_at).getTime() <
        RESEND_COOLDOWN_SECONDS * 1000
    ) {
      throw new HttpException(
        'একটু পরে আবার কোড চাইতে পারবেন',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = String(randomInt(100000, 1000000));
    const { error } = await db.from('phone_otps').insert({
      phone,
      code_hash: hash(code),
      expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60000).toISOString(),
    });
    if (error) throw new BadRequestException('কোড পাঠানো যায়নি');

    await smsProvider().send(
      phone,
      `Azmirs: আপনার অর্ডার কনফার্মেশন কোড ${code}। ${OTP_TTL_MINUTES} মিনিটের মধ্যে দিন।`,
    );
    return { ok: true };
  }

  async verify(rawPhone: string, code: string) {
    const phone = normalizePhone(rawPhone);
    const db = supabaseAdmin();
    const row = await db
      .from('phone_otps')
      .select('id,code_hash,expires_at,attempts,verified_at')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row.data) throw new BadRequestException('আগে কোড চান');
    if (row.data.verified_at) return { ok: true };
    if (row.data.attempts >= MAX_ATTEMPTS)
      throw new BadRequestException('অনেকবার ভুল হয়েছে, নতুন কোড চান');
    if (new Date(row.data.expires_at).getTime() < Date.now())
      throw new BadRequestException('কোডের মেয়াদ শেষ, নতুন কোড চান');

    if (row.data.code_hash !== hash(String(code ?? '').trim())) {
      await db
        .from('phone_otps')
        .update({ attempts: row.data.attempts + 1 })
        .eq('id', row.data.id);
      throw new BadRequestException('কোডটা মেলেনি');
    }
    await db
      .from('phone_otps')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', row.data.id);
    return { ok: true };
  }

  /* Called by order creation when OTP is required */
  async assertVerified(rawPhone: string) {
    if (!otpRequired()) return;
    const phone = normalizePhone(rawPhone);
    const db = supabaseAdmin();
    const row = await db
      .from('phone_otps')
      .select('verified_at')
      .eq('phone', phone)
      .gte(
        'verified_at',
        new Date(Date.now() - VERIFY_WINDOW_MINUTES * 60000).toISOString(),
      )
      .order('verified_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row.data)
      throw new BadRequestException('ফোন নম্বরটা আগে OTP দিয়ে যাচাই করুন');
  }
}
