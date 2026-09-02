import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { OrdersModule } from './orders/orders.module.js';
import { AdminModule } from './admin/admin.module.js';
import { OtpModule } from './otp/otp.module.js';
import { PaymentsModule } from './payments/payments.module.js';

@Module({
  imports: [OrdersModule, AdminModule, OtpModule, PaymentsModule],
  controllers: [AppController],
})
export class AppModule {}
