import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../database/prisma';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';

function mapMembershipToLegacyFields(membership?: {
  familyId: string;
  role: string | null;
} | null) {
  return {
    coupleId: membership?.familyId ?? null,
    familyId: membership?.familyId ?? null,
    role: membership?.role ?? null,
  };
}

export class AuthService {
  async register(
    email: string,
    password: string,
    name: string,
    _role: 'husband' | 'wife'
  ) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError('EMAIL_EXISTS', '该邮箱已被注册', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    const legacyFields = mapMembershipToLegacyFields(null);

    const accessToken = this.generateAccessToken({
      id: user.id,
      email: user.email,
      ...legacyFields,
    });
    const refreshToken = this.generateRefreshToken({
      id: user.id,
      email: user.email,
      ...legacyFields,
    });

    return {
      user: {
        ...user,
        ...legacyFields,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        familyMembers: {
          where: { status: 'active' },
          orderBy: { joinedAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new AppError('INVALID_CREDENTIALS', '邮箱或密码错误', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError('INVALID_CREDENTIALS', '邮箱或密码错误', 401);
    }

    const membership = user.familyMembers[0];
    const legacyFields = mapMembershipToLegacyFields(
      membership
        ? {
            familyId: membership.familyId,
            role: membership.role,
          }
        : null
    );

    const accessToken = this.generateAccessToken({
      id: user.id,
      email: user.email,
      ...legacyFields,
    });

    const refreshToken = this.generateRefreshToken({
      id: user.id,
      email: user.email,
      ...legacyFields,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        ...legacyFields,
      },
      accessToken,
      refreshToken,
    };
  }

  async logout(userId: string) {
    return { success: true };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        familyMembers: {
          where: { status: 'active' },
          orderBy: { joinedAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
    }

    const membership = user.familyMembers[0];
    const legacyFields = mapMembershipToLegacyFields(
      membership
        ? {
            familyId: membership.familyId,
            role: membership.role,
          }
        : null
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      createdAt: user.createdAt,
      ...legacyFields,
    };
  }

  private generateAccessToken(payload: {
    id: string;
    email: string;
    role: string | null;
    coupleId: string | null;
    familyId: string | null;
  }): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessTokenExpiresIn as any,
    });
  }

  private generateRefreshToken(payload: {
    id: string;
    email: string;
    role: string | null;
    coupleId: string | null;
    familyId: string | null;
  }): string {
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshTokenExpiresIn as any,
    });
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as any;

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: {
          familyMembers: {
            where: { status: 'active' },
            orderBy: { joinedAt: 'asc' },
            take: 1,
          },
        },
      });

      if (!user) {
        throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
      }

      const membership = user.familyMembers[0];
      const legacyFields = mapMembershipToLegacyFields(
        membership
          ? {
              familyId: membership.familyId,
              role: membership.role,
            }
          : null
      );

      const newAccessToken = this.generateAccessToken({
        id: user.id,
        email: user.email,
        ...legacyFields,
      });

      return { accessToken: newAccessToken };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('REFRESH_TOKEN_EXPIRED', 'Refresh Token 已过期，请重新登录', 401);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('INVALID_REFRESH_TOKEN', '无效的 Refresh Token', 401);
      }
      throw error;
    }
  }
}

export const authService = new AuthService();
