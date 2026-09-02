import { Body, Controller, Get, Post } from '@nestjs/common';
import { OtpService } from './otp.service.js';

@Controller('otp')
export class OtpController {
  constructor(private readonly otp: OtpService) {}

  @Get('config')
  config() {
    return this.otp.config();
  }

  @Post('send')
  send(@Body() body: { phone: string }) {
    return this.otp.send(String(body.phone ?? ''));
  }

  @Post('verify')
  verify(@Body() body: { phone: string; code: string }) {
    return this.otp.verify(String(body.phone ?? ''), String(body.code ?? ''));
  }
}
