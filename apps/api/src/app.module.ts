import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { OrdersModule } from './orders/orders.module.js';

@Module({
  imports: [OrdersModule],
  controllers: [AppController],
})
export class AppModule {}
