import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { supabaseAdmin } from '../supabase.js';
import { CreateOrderDto } from './create-order.dto.js';
import { OtpService } from '../otp/otp.service.js';

/* Server-side truth for measurements (inches). Mirrors
   apps/web/lib/supabase.ts MEASUREMENT_FIELDS — keep the two in sync. */
const MEASUREMENT_LIMITS: Record<string, [number, number]> = {
  shoulder: [5, 90],
  armhole: [5, 90],
  bust: [5, 90],
  waist: [5, 90],
  hip: [5, 90],
  sleeve_length: [5, 90],
  cuff: [3, 40],
  kameez_length: [15, 90],
  salwar_length: [15, 90],
  height: [30, 90],
};

const ADVANCE_PERCENT = 30;

type Priced = {
  base_price: number;
  fabric_price: number;
  lace_price: number;
  vat_amount: number;
  transportation_price: number;
  total_price: number;
  advance_amount: number;
  remaining_cod_amount: number;
};

@Injectable()
export class OrdersService {
  constructor(private readonly otp: OtpService) {}

  /* The price is ALWAYS recalculated here from the database. Nothing the
     frontend sends about money is read, let alone trusted. */
  async create(dto: CreateOrderDto) {
    const db = supabaseAdmin();
    /* Phone must be OTP-verified when OTP is enabled (plan ৪.১ step 9) */
    await this.otp.assertVerified(dto.customer.phone);

    /* 1. Load every referenced row and verify the relationships */
    const [design, colorway, garment, style, lace, compat] = await Promise.all([
      db
        .from('fabric_designs')
        .select('id,name,status')
        .eq('id', dto.fabric_design_id)
        .maybeSingle(),
      db
        .from('design_colorways')
        .select('id,fabric_design_id,name,is_active')
        .eq('id', dto.colorway_id)
        .maybeSingle(),
      db
        .from('garment_types')
        .select('id,slug,name_bn,is_active')
        .eq('id', dto.garment_type_id)
        .maybeSingle(),
      db
        .from('design_style_photos')
        .select('id,fabric_design_id,garment_type_id,cutting_spec,is_active')
        .eq('id', dto.style_photo_id)
        .maybeSingle(),
      dto.lace_option_id
        ? db
            .from('lace_options')
            .select('id,name,price_per_gojo,is_active')
            .eq('id', dto.lace_option_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      db
        .from('fabric_design_garment_compatibility')
        .select('fabric_design_id')
        .eq('fabric_design_id', dto.fabric_design_id)
        .eq('garment_type_id', dto.garment_type_id)
        .maybeSingle(),
    ]);

    if (!design.data || design.data.status !== 'active')
      throw new NotFoundException('ডিজাইনটা পাওয়া যায়নি');
    if (
      !colorway.data ||
      !colorway.data.is_active ||
      colorway.data.fabric_design_id !== dto.fabric_design_id
    )
      throw new BadRequestException('কালারওয়েটা এই ডিজাইনের না');
    if (!garment.data || !garment.data.is_active)
      throw new NotFoundException('গার্মেন্ট টাইপটা পাওয়া যায়নি');
    if (!compat.data)
      throw new BadRequestException('এই প্রিন্ট এই গার্মেন্ট টাইপে হয় না');
    if (
      !style.data ||
      !style.data.is_active ||
      style.data.fabric_design_id !== dto.fabric_design_id ||
      style.data.garment_type_id !== dto.garment_type_id
    )
      throw new BadRequestException('স্টাইলটা এই প্রিন্ট আর গার্মেন্টের সাথে মেলে না');
    if (dto.lace_option_id && (!lace.data || !lace.data.is_active))
      throw new BadRequestException('লেইস অপশনটা পাওয়া যায়নি');

    /* 2. Sizing: one path must be COMPLETE or the order does not exist */
    let measurementData: Record<string, number> | null = null;
    if (dto.sizing_method === 'measurement_form') {
      const m = dto.measurements ?? {};
      for (const [key, [min, max]] of Object.entries(MEASUREMENT_LIMITS)) {
        const v = Number(m[key]);
        if (!Number.isFinite(v) || v < min || v > max) {
          throw new BadRequestException(
            `মাপ অসম্পূর্ণ: ${key} (${min}-${max} ইঞ্চির মধ্যে দিন)`,
          );
        }
      }
      measurementData = Object.fromEntries(
        Object.keys(MEASUREMENT_LIMITS).map((k) => [k, Number(m[k])]),
      );
    }

    /* 3. Price, computed from the database alone */
    const priced = await this.price(
      dto.garment_type_id,
      style.data.cutting_spec as Record<string, unknown>,
      lace.data ? Number(lace.data.price_per_gojo) : null,
    );

    /* 4. Customer: reuse by phone, else create */
    const phone = dto.customer.phone.replace(/^\+?880/, '0').replace(/^00/, '0');
    const existing = await db
      .from('customers')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();
    let customerId = existing.data?.id as string | undefined;
    if (!customerId) {
      const ins = await db
        .from('customers')
        .insert({
          name: dto.customer.name,
          phone,
          address: dto.customer.address ?? null,
          delivery_area: dto.customer.delivery_area ?? null,
        })
        .select('id')
        .single();
      if (ins.error) throw new ConflictException('কাস্টমার তৈরি করা যায়নি');
      customerId = ins.data.id as string;
    }

    /* 5. Order, with a human order number (retry on the rare collision) */
    for (let attempt = 0; attempt < 4; attempt++) {
      const orderNumber = `AZM-${new Date().getFullYear()}-${String(
        Math.floor(1000 + Math.random() * 9000),
      )}`;
      const ins = await db
        .from('orders')
        .insert({
          order_number: orderNumber,
          customer_id: customerId,
          garment_type_id: dto.garment_type_id,
          fabric_design_id: dto.fabric_design_id,
          colorway_id: dto.colorway_id,
          style_photo_id: dto.style_photo_id,
          lace_option_id: dto.lace_option_id ?? null,
          cutting_selections: style.data.cutting_spec ?? {},
          sizing_method: dto.sizing_method,
          measurement_data: measurementData,
          reference_garment_courier_info:
            dto.sizing_method === 'reference_garment' ? { status: 'awaited' } : null,
          base_price: priced.base_price,
          fabric_price: priced.fabric_price,
          lace_price: priced.lace_price,
          vat_amount: priced.vat_amount,
          transportation_price: priced.transportation_price,
          total_price: priced.total_price,
          advance_paid_percent: ADVANCE_PERCENT,
          advance_paid_amount: 0,
          remaining_cod_amount: priced.total_price,
          status: 'pending_advance',
        })
        .select('id,order_number')
        .single();

      if (!ins.error) {
        await db.from('order_status_history').insert({
          order_id: ins.data.id,
          status: 'pending_advance',
          note: dto.note ?? null,
        });
        return {
          order_number: ins.data.order_number,
          status: 'pending_advance',
          price: priced,
          advance_percent: ADVANCE_PERCENT,
        };
      }
      if (ins.error.code !== '23505') {
        throw new ConflictException('অর্ডার লেখা যায়নি, একটু পরে চেষ্টা করুন');
      }
    }
    throw new ConflictException('অর্ডার নম্বর তৈরি করা যায়নি, আবার চেষ্টা করুন');
  }

  private async price(
    garmentTypeId: string,
    cuttingSpec: Record<string, unknown>,
    lacePerGojo: number | null,
  ): Promise<Priced> {
    const db = supabaseAdmin();
    const rule = await db
      .from('pricing_rules')
      .select('base_stitching_price,vat_percent,transportation_flat')
      .eq('garment_type_id', garmentTypeId)
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!rule.data) {
      /* No invented prices, ever: without a pricing rule the order is refused */
      throw new ConflictException(
        'এই গার্মেন্টের দাম এখনো সেট হয়নি, তাই অর্ডার নেওয়া যাচ্ছে না',
      );
    }

    const base = Number(rule.data.base_stitching_price);
    /* Fabric rate model is not in the schema yet (plan ২.১); until it is,
       fabric cost is folded into base_stitching_price by the admin. */
    const fabric = 0;
    /* Lace need per style is fixed at sampling time and stored on the style
       photo's cutting_spec as lace_gojo. No lace_gojo -> no lace charge. */
    const laceGojo = Number((cuttingSpec ?? {})['lace_gojo'] ?? 0);
    const lacePrice =
      lacePerGojo && Number.isFinite(laceGojo) && laceGojo > 0
        ? Math.round(lacePerGojo * laceGojo)
        : 0;

    const subtotal = base + fabric + lacePrice;
    const vat = Math.round((subtotal * Number(rule.data.vat_percent ?? 0)) / 100);
    const transport = Number(rule.data.transportation_flat ?? 0);
    const total = subtotal + vat + transport;
    const advance = Math.round((total * ADVANCE_PERCENT) / 100);

    return {
      base_price: base,
      fabric_price: fabric,
      lace_price: lacePrice,
      vat_amount: vat,
      transportation_price: transport,
      total_price: total,
      advance_amount: advance,
      remaining_cod_amount: total - advance,
    };
  }
}
