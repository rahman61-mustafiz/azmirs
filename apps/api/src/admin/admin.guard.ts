import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

/* Shared-secret admin auth: the token lives in the API env (ADMIN_TOKEN)
   and in the admin's head. Every /admin/* call carries it as a Bearer. */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const expected = process.env.ADMIN_TOKEN;
    if (!expected) throw new UnauthorizedException('ADMIN_TOKEN is not configured');
    const req = ctx.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (token !== expected) throw new UnauthorizedException('ভুল অ্যাডমিন টোকেন');
    return true;
  }
}
