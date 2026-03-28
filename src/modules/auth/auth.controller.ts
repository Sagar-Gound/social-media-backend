import { Request, Response } from 'express';
import { asyncWrapper } from '../../shared';
import { env } from '../../config';
import * as authService from './auth.service';
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  refreshTokenSchema,
} from './auth.validation';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
  domain: env.COOKIE_DOMAIN,
  path: '/api/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ─── Register ─────────────────────────────────────────────
export const register = asyncWrapper(async (req: Request, res: Response) => {
  const body = registerSchema.parse(req.body);
  const result = await authService.registerLocal(body);

  res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

  res.status(201).json({
    status: 'success',
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

// ─── Login ────────────────────────────────────────────────
export const login = asyncWrapper(async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);
  const result = await authService.loginLocal(body);

  res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

  res.json({
    status: 'success',
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

// ─── Google OAuth ─────────────────────────────────────────
export const googleLogin = asyncWrapper(async (req: Request, res: Response) => {
  const { idToken } = googleAuthSchema.parse(req.body);
  const result = await authService.googleAuth(idToken);

  res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);

  res.json({
    status: 'success',
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

// ─── Refresh Token ────────────────────────────────────────
export const refresh = asyncWrapper(async (req: Request, res: Response) => {
  // Accept from cookie OR body (for React Native which can't send cookies easily)
  const token =
    req.cookies?.refreshToken || refreshTokenSchema.parse(req.body).refreshToken;

  const tokens = await authService.refreshAccessToken(token);

  res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

  res.json({
    status: 'success',
    data: {
      accessToken: tokens.accessToken,
    },
  });
});

// ─── Logout ───────────────────────────────────────────────
export const logout = asyncWrapper(async (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId;
  await authService.logout(userId);

  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });

  res.json({ status: 'success', message: 'Logged out successfully' });
});

// ─── Me (get current user) ───────────────────────────────
export const me = asyncWrapper(async (req: Request, res: Response) => {
  const userId = (req as Request & { userId: string }).userId;

  const { prisma } = await import('../../config');
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    res.status(404).json({ status: 'error', message: 'User not found' });
    return;
  }

  res.json({
    status: 'success',
    data: {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    },
  });
});
