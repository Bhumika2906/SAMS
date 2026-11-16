import type { UserRole } from '@sams/shared';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { loadConfig } from '../config';
import { forbidden, unauthorized } from '../errors';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  email: string;
  iat?: number;
  exp?: number;
}

export function signToken(payload: { id: string; role: UserRole; email: string }): string {
  const config = loadConfig();
  return jwt.sign(
    {
      sub: payload.id,
      role: payload.role,
      email: payload.email,
    },
    config.JWT_SECRET,
    { expiresIn: '7d' },
  );
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(unauthorized('Authorization header with Bearer token is required'));
    return;
  }

  const token = authHeader.substring(7).trim();
  const config = loadConfig();

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      email: decoded.email,
    };
    next();
  } catch {
    next(unauthorized('Invalid or expired token'));
  }
}

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorized('Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(forbidden(`Access denied for role ${req.user.role}`));
      return;
    }

    next();
  };
}
