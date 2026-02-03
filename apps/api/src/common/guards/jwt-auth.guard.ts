import { type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { SKIP_AUTH_KEY } from '../decorators/skip-auth.decorator';

/**
 * Global JWT authentication guard.
 *
 * This guard is applied globally to all routes via APP_GUARD in AppModule.
 * All routes require valid JWT authentication by default.
 *
 * To make a route publicly accessible, use the @SkipAuth() decorator.
 *
 * @see SkipAuth
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const skipAuth = this.reflector.getAllAndOverride<boolean>(SKIP_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipAuth) {
      return true;
    }

    return super.canActivate(context);
  }
}
