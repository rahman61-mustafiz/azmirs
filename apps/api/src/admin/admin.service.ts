import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../supabase.js';
import type { UploadedImage } from './upload-image.js';

export const ORDER_STATUSES = [
  'pending_advance',
  'confirmed',
  'measurement_received',
  'cutting',
  'stitching',
  'embellishment',
  'qc',
  'ready_to_ship',
  'shipped',
  'delivered',
  'cancelled',
] as const;

const BUCKET = 'catalog';

@Injectable()
export class AdminService {
  private async upload(
    file: UploadedImage,
    folder: string,
  ): Promise<string> {
    const db = supabaseAdmin();
    const ext = (file.originalname.split('.').pop() ?? 'jpg').toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext))
      throw new BadRequestException('ছবি jpg/png/webp হতে হবে');
    const path = `${folder}/${randomUUID()}.${ext}`;
    const { error } = await db.storage
      .from(BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype });
    if (error) throw new ConflictException(`ছবি আপলোড হয়নি: ${error.message}`);
    return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async overview() {
    const db = supabaseAdmin();
    const [designs, colorways, styles, laces, garments] = await Promise.all([
      db.from('fabric_designs').select('*').order('created_at'),
      db.from('design_colorways').select('*').order('sort_order'),
      db
        .from('design_style_photos')
        .select('id,fabric_design_id,garment_type_id,photo_url,is_active,sort_order,style_notes')
        .order('sort_order'),
      db.from('lace_options').select('*').order('created_at'),
      db.from('garment_types').select('*').order('sort_order'),
    ]);
    const compat = await db
      .from('fabric_design_garment_compatibility')
      .select('fabric_design_id,garment_type_id');
    return {
      designs: designs.data ?? [],
      colorways: colorways.data ?? [],
      styles: styles.data ?? [],
      laces: laces.data ?? [],
      garments: garments.data ?? [],
      compatibility: compat.data ?? [],
    };
  }

  async createDesign(body: {
    name?: string;
    print_type?: string;
    garment_type_ids?: string[];
  }) {
    const db = supabaseAdmin();
    if (!body.name?.trim()) throw new BadRequestException('নাম লাগবে');
    if (!['allover_repeat', 'engineered_panel'].includes(body.print_type ?? ''))
      throw new BadRequestException('print_type ভুল');
    if (!body.garment_type_ids?.length)
      throw new BadRequestException('অন্তত একটা গার্মেন্ট টাইপ বাছুন');
    const ins = await db
      .from('fabric_designs')
      .insert({
        name: body.name.trim(),
        print_type: body.print_type,
        design_source: 'atif',
        base_fabric_type: 'cotton',
        status: 'active',
      })
      .select('id')
      .single();
    if (ins.error) throw new ConflictException(ins.error.message);
    const rows = body.garment_type_ids.map((g) => ({
      fabric_design_id: ins.data.id,
      garment_type_id: g,
    }));
    await db.from('fabric_design_garment_compatibility').insert(rows);
    return { id: ins.data.id };
  }

  async createColorway(
    body: { fabric_design_id?: string; name?: string; sort_order?: string },
    file?: UploadedImage,
  ) {
    const db = supabaseAdmin();
    if (!body.fabric_design_id || !body.name?.trim())
      throw new BadRequestException('ডিজাইন আর নাম লাগবে');
    const thumbnail_url = file ? await this.upload(file, 'colorways') : null;
    const ins = await db
      .from('design_colorways')
      .insert({
        fabric_design_id: body.fabric_design_id,
        name: body.name.trim(),
        thumbnail_url,
        sort_order: Number(body.sort_order ?? 0),
      })
      .select('id')
      .single();
    if (ins.error) throw new ConflictException(ins.error.message);
    return { id: ins.data.id, thumbnail_url };
  }

  async createStylePhoto(
    body: {
      fabric_design_id?: string;
      garment_type_id?: string;
      sort_order?: string;
      style_notes?: string;
    },
    file?: UploadedImage,
  ) {
    const db = supabaseAdmin();
    if (!body.fabric_design_id || !body.garment_type_id)
      throw new BadRequestException('ডিজাইন আর গার্মেন্ট টাইপ লাগবে');
    if (!file) throw new BadRequestException('স্টাইলের ছবিটাই তো লাগবে');
    const { count } = await db
      .from('design_style_photos')
      .select('*', { count: 'exact', head: true })
      .eq('fabric_design_id', body.fabric_design_id)
      .eq('garment_type_id', body.garment_type_id)
      .eq('is_active', true);
    if ((count ?? 0) >= 5)
      throw new ConflictException(
        'এই ডিজাইন+গার্মেন্টে ৫টা active স্টাইল আছেই; আগে একটা বন্ধ করুন',
      );
    const photo_url = await this.upload(file, 'styles');
    const ins = await db
      .from('design_style_photos')
      .insert({
        fabric_design_id: body.fabric_design_id,
        garment_type_id: body.garment_type_id,
        photo_url,
        sort_order: Number(body.sort_order ?? count ?? 0),
        style_notes: body.style_notes?.trim() || null,
      })
      .select('id')
      .single();
    if (ins.error) throw new ConflictException(ins.error.message);
    return { id: ins.data.id, photo_url };
  }

  async createLace(
    body: { name?: string; price_per_gojo?: string },
    file?: UploadedImage,
  ) {
    const db = supabaseAdmin();
    const price = Number(body.price_per_gojo);
    if (!body.name?.trim() || !Number.isFinite(price) || price <= 0)
      throw new BadRequestException('নাম আর প্রতি গজ দাম (টাকায়) লাগবে');
    const image_url = file ? await this.upload(file, 'laces') : null;
    const ins = await db
      .from('lace_options')
      .insert({ name: body.name.trim(), price_per_gojo: price, image_url })
      .select('id')
      .single();
    if (ins.error) throw new ConflictException(ins.error.message);
    return { id: ins.data.id, image_url };
  }

  async setActive(
    table: 'design_style_photos' | 'lace_options' | 'design_colorways',
    id: string,
    isActive: boolean,
  ) {
    const db = supabaseAdmin();
    const { error } = await db.from(table).update({ is_active: isActive }).eq('id', id);
    if (error) throw new ConflictException(error.message);
    return { ok: true };
  }

  async listOrders() {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from('orders')
      .select(
        `id,order_number,status,total_price,advance_paid_amount,remaining_cod_amount,
         sizing_method,created_at,expected_delivery_date,
         customers(name,phone,delivery_area),
         fabric_designs(name),garment_types(name_bn),design_colorways(name),
         lace_options(name)`,
      )
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw new ConflictException(error.message);
    return data;
  }

  async orderDetail(id: string) {
    const db = supabaseAdmin();
    const [order, history] = await Promise.all([
      db
        .from('orders')
        .select(
          `*,customers(name,phone,address,delivery_area),
           fabric_designs(name),garment_types(name_bn),design_colorways(name),
           lace_options(name),design_style_photos(photo_url)`,
        )
        .eq('id', id)
        .maybeSingle(),
      db
        .from('order_status_history')
        .select('status,note,changed_at')
        .eq('order_id', id)
        .order('changed_at', { ascending: true }),
    ]);
    if (!order.data) throw new NotFoundException('অর্ডার পাওয়া যায়নি');
    return { order: order.data, history: history.data ?? [] };
  }

  async updateStatus(id: string, status: string, note?: string) {
    if (!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number]))
      throw new BadRequestException('স্ট্যাটাসটা তালিকার বাইরে');
    const db = supabaseAdmin();
    const upd = await db.from('orders').update({ status }).eq('id', id).select('id').maybeSingle();
    if (upd.error) throw new ConflictException(upd.error.message);
    if (!upd.data) throw new NotFoundException('অর্ডার পাওয়া যায়নি');
    await db
      .from('order_status_history')
      .insert({ order_id: id, status, note: note?.trim() || null });
    return { ok: true, status };
  }
}
