import { Controller, Get, HttpException, HttpStatus, Param } from '@nestjs/common';

/* SSLCommerz integration lands here once the merchant account exists
   (sandbox first: store creds via env SSLCZ_STORE_ID / SSLCZ_STORE_PASSWD,
   initiate -> redirect URL -> IPN/callback validates and marks the
   order's advance as paid). Until then the endpoint says so honestly. */

@Controller('payments')
export class PaymentsController {
  @Get('initiate/:orderId')
  initiate(@Param('orderId') _orderId: string) {
    throw new HttpException(
      {
        message:
          'অনলাইন অ্যাডভান্স পেমেন্ট এখনো চালু হয়নি। অর্ডারের পরে আমরা ফোন করে bKash নম্বর জানাই, অ্যাডভান্স পৌঁছালে অর্ডার কনফার্ম হয়।',
        online_payment: 'not_yet_available',
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}
