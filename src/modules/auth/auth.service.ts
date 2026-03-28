import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma, env } from '@/config';
import { AppError } from '@/shared';
import { RegisterInput, LoginInput } from './auth.validation';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

// ─── Token helpers ────────────────────────────────────────

interface TokenPayload {
  userId: string;
  email: string;
}

function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as SignOptions);
}

function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);
}

function generateTokens(payload: TokenPayload) {
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

// ─── Service functions ────────────────────────────────────

export async function registerLocal(input: RegisterInput) {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
  });

  if (existing) {
    const field = existing.email === input.email ? 'email' : 'username';
    throw AppError.conflict(`A user with this ${field} already exists`);
  }

  const hashedPassword = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      displayName: input.displayName ?? input.username,
      password: hashedPassword,
      provider: 'LOCAL',
    },
  });

  const tokens = generateTokens({ userId: user.id, email: user.email });

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

export async function loginLocal(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !user.password) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const passwordValid = await bcrypt.compare(input.password, user.password);
  if (!passwordValid) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const tokens = generateTokens({ userId: user.id, email: user.email });

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

export async function googleAuth(idToken: string) {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw AppError.unauthorized('Invalid Google token');
  }

  let user = await prisma.user.findFirst({
    where: { provider: 'GOOGLE', providerId: payload.sub },
  });

  if (!user) {
    // Check if email is already taken by a local account
    const existingLocal = await prisma.user.findUnique({ where: { email: payload.email } });
    if (existingLocal) {
      throw AppError.conflict(
        'An account with this email already exists. Please log in with your password.',
      );
    }

    // Create a username from email prefix + random suffix
    const baseUsername = payload.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
    const username = `${baseUsername}_${Date.now().toString(36)}`;

    user = await prisma.user.create({
      data: {
        email: payload.email,
        username,
        displayName: payload.name ?? baseUsername,
        avatarUrl: payload.picture,
        provider: 'GOOGLE',
        providerId: payload.sub,
        isVerified: true,
      },
    });
  }

  const tokens = generateTokens({ userId: user.id, email: user.email });

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

export async function refreshAccessToken(refreshToken: string) {
  let decoded: TokenPayload;
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as TokenPayload;
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

  if (!user || user.refreshToken !== refreshToken) {
    throw AppError.unauthorized('Refresh token has been revoked');
  }

  const tokens = generateTokens({ userId: user.id, email: user.email });

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: tokens.refreshToken },
  });

  return tokens;
}

export async function logout(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
}

// ─── Helpers ──────────────────────────────────────────────

function sanitizeUser(user: { id: string; email: string; username: string; displayName: string | null; avatarUrl: string | null; provider: string; isVerified: boolean; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    provider: user.provider,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
}
