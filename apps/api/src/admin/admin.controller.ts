import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from './admin.guard.js';
import { AdminService } from './admin.service.js';
import type { UploadedImage } from './upload-image.js';

const IMAGE_LIMIT = { limits: { fileSize: 8 * 1024 * 1024 } };

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('overview')
  overview() {
    return this.admin.overview();
  }

  @Post('designs')
  createDesign(@Body() body: Record<string, unknown>) {
    return this.admin.createDesign(body as never);
  }

  @Post('colorways')
  @UseInterceptors(FileInterceptor('image', IMAGE_LIMIT))
  createColorway(
    @Body() body: Record<string, string>,
    @UploadedFile() file?: UploadedImage,
  ) {
    return this.admin.createColorway(body, file);
  }

  @Post('style-photos')
  @UseInterceptors(FileInterceptor('image', IMAGE_LIMIT))
  createStylePhoto(
    @Body() body: Record<string, string>,
    @UploadedFile() file?: UploadedImage,
  ) {
    return this.admin.createStylePhoto(body, file);
  }

  @Post('laces')
  @UseInterceptors(FileInterceptor('image', IMAGE_LIMIT))
  createLace(
    @Body() body: Record<string, string>,
    @UploadedFile() file?: UploadedImage,
  ) {
    return this.admin.createLace(body, file);
  }

  @Patch('style-photos/:id/active')
  styleActive(@Param('id') id: string, @Body() body: { is_active: boolean }) {
    return this.admin.setActive('design_style_photos', id, !!body.is_active);
  }

  @Patch('laces/:id/active')
  laceActive(@Param('id') id: string, @Body() body: { is_active: boolean }) {
    return this.admin.setActive('lace_options', id, !!body.is_active);
  }

  @Patch('colorways/:id/active')
  colorwayActive(@Param('id') id: string, @Body() body: { is_active: boolean }) {
    return this.admin.setActive('design_colorways', id, !!body.is_active);
  }

  @Get('orders')
  orders() {
    return this.admin.listOrders();
  }

  @Get('orders/:id')
  orderDetail(@Param('id') id: string) {
    return this.admin.orderDetail(id);
  }

  @Patch('orders/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; note?: string },
  ) {
    return this.admin.updateStatus(id, body.status, body.note);
  }
}
