# Authentication

## Overview

The API uses JWT-based authentication with access and refresh tokens. All routes are protected by default and require a valid JWT access token.

## Authentication Flow

1. **Login** (`POST /api/auth/login`) - Returns access token and sets refresh token as httpOnly cookie
2. **Use access token** - Include in `Authorization: Bearer <token>` header
3. **Refresh** (`POST /api/auth/refresh`) - Uses refresh token cookie to get new tokens
4. **Logout** (`POST /api/auth/logout`) - Invalidates refresh token

## Global Authentication Guard

The `JwtAuthGuard` is registered globally in `AppModule`:

```typescript
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
```

This means **all routes require authentication by default**.

## @SkipAuth() Decorator

To make a route publicly accessible, use the `@SkipAuth()` decorator.

### Usage

```typescript
import { Controller, Get, Post } from '@nestjs/common';
import { SkipAuth } from '../../common/decorators';

@Controller('example')
export class ExampleController {
  // This route requires authentication (default)
  @Get('protected')
  getProtected() {
    return { message: 'You are authenticated!' };
  }

  // This route is publicly accessible
  @SkipAuth()
  @Get('public')
  getPublic() {
    return { message: 'Anyone can access this' };
  }
}
```

### Controller-Level Usage

Apply to entire controller to skip auth for all routes:

```typescript
@SkipAuth()
@Controller('public')
export class PublicController {
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('version')
  version() {
    return { version: '1.0.0' };
  }
}
```

## Token Configuration

| Token | Expiration | Storage |
|-------|------------|---------|
| Access Token | 15 minutes | Client (memory/localStorage) |
| Refresh Token | 7 days | httpOnly cookie |

## Environment Variables

```bash
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

## Swagger Integration

Protected routes show a lock icon in Swagger UI. Click "Authorize" and enter the JWT token to test protected endpoints.

Routes with `@SkipAuth()` don't require authorization in Swagger.
