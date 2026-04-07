import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { buildLegacyUser, getRequiredFamilyMembership } from '../utils/family';

export class WishService {
  async getWishes(userId: string) {
    const membership = await getRequiredFamilyMembership(userId);

    const wishes = await prisma.wish.findMany({
      where: { familyId: membership.familyId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            familyMembers: {
              where: { familyId: membership.familyId, status: 'active' },
              select: { familyId: true, role: true },
              take: 1,
            },
          },
        },
      },
    });

    return wishes.map((wish) => ({ ...wish, user: buildLegacyUser(wish.user) }));
  }

  async createWish(userId: string, data: { title: string; description?: string; price?: number; category?: string; }) {
    const membership = await getRequiredFamilyMembership(userId);

    const wish = await prisma.wish.create({
      data: {
        familyId: membership.familyId,
        userId,
        title: data.title,
        description: data.description || null,
        price: data.price,
        category: data.category || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            familyMembers: {
              where: { familyId: membership.familyId, status: 'active' },
              select: { familyId: true, role: true },
              take: 1,
            },
          },
        },
      },
    });

    return { ...wish, user: buildLegacyUser(wish.user) };
  }

  async updateWish(userId: string, id: string, data: { title?: string; description?: string; price?: number; category?: string; }) {
    const membership = await getRequiredFamilyMembership(userId);
    const existing = await prisma.wish.findFirst({ where: { id, familyId: membership.familyId } });
    if (!existing) throw new AppError('WISH_NOT_FOUND', '心愿不存在', 404);
    if (existing.userId !== userId) throw new AppError('FORBIDDEN', '只有创建人可以编辑心愿', 403);

    const wish = await prisma.wish.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            familyMembers: {
              where: { familyId: membership.familyId, status: 'active' },
              select: { familyId: true, role: true },
              take: 1,
            },
          },
        },
      },
    });

    return { ...wish, user: buildLegacyUser(wish.user) };
  }

  async updateWishStatus(userId: string, id: string, status: 'pending' | 'completed') {
    const membership = await getRequiredFamilyMembership(userId);
    const existing = await prisma.wish.findFirst({ where: { id, familyId: membership.familyId } });
    if (!existing) throw new AppError('WISH_NOT_FOUND', '心愿不存在', 404);
    if (existing.userId !== userId) throw new AppError('FORBIDDEN', '只有创建人可以更新心愿状态', 403);

    const wish = await prisma.wish.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            familyMembers: {
              where: { familyId: membership.familyId, status: 'active' },
              select: { familyId: true, role: true },
              take: 1,
            },
          },
        },
      },
    });

    return { ...wish, user: buildLegacyUser(wish.user) };
  }

  async deleteWish(userId: string, id: string) {
    const membership = await getRequiredFamilyMembership(userId);
    const existing = await prisma.wish.findFirst({ where: { id, familyId: membership.familyId } });
    if (!existing) throw new AppError('WISH_NOT_FOUND', '心愿不存在', 404);
    if (existing.userId !== userId) throw new AppError('FORBIDDEN', '只有创建人可以删除心愿', 403);
    await prisma.wish.delete({ where: { id } });
    return { success: true };
  }
}

export const wishService = new WishService();
