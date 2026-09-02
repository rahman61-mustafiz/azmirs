import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { OtpModule } from '../otp/otp.module.js';

@Module({
  imports: [OtpModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
