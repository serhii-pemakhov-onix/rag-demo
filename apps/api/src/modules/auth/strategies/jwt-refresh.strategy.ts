import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import type { StrategyOptionsWithRequest } from 'passport-jwt';
import { Strategy } from 'passport-jwt';
import type { JwtPayload } from './jwt.strategy';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not defined');
    }
    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: (req: Request) => {
        return req?.cookies?.refreshToken;
      },
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    };
    super(options);
  }

  async validate(req: Request, payload: JwtPayload) {
    const refreshToken = req.cookies?.refreshToken;
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      refreshToken,
    };
  }
}
