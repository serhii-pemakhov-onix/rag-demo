import { SetMetadata } from '@nestjs/common';

export const SKIP_AUTH_KEY = 'skipAuth';

/**
 * Decorator to mark routes as publicly accessible (no authentication required).
 *
 * By default, all routes are protected by JwtAuthGuard.
 * Apply this decorator to controllers or route handlers to skip authentication.
 *
 * @example
 * // Skip auth for a single route
 * @SkipAuth()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 *
 * @example
 * // Skip auth for entire controller
 * @SkipAuth()
 * @Controller('public')
 * export class PublicController { }
 */
export const SkipAuth = () => SetMetadata(SKIP_AUTH_KEY, true);
