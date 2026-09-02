import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { OrdersModule } from './orders/orders.module.js';
import { AdminModule } from './admin/admin.module.js';

@Module({
  imports: [OrdersModule, AdminModule],
  controllers: [AppController],
})
export class AppModule {}
