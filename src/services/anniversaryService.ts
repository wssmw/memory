import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { buildLegacyUser, getRequiredFamilyMembership } from '../utils/family';

export class AnniversaryService {
  async getAnniversaries(userId: string) {
    const membership = await getRequiredFamilyMembership(userId);

    const anniversaries = await prisma.anniversary.findMany({
      where: { familyId: membership.familyId },
      orderBy: { date: 'asc' },
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

    return anniversaries.map((anniversary) => ({ ...anniversary, user: buildLegacyUser(anniversary.user) }));
  }

  async createAnniversary(userId: string, data: { name: string; date: string; description?: string; }) {
    const membership = await getRequiredFamilyMembership(userId);

    const anniversary = await prisma.anniversary.create({
      data: {
        familyId: membership.familyId,
        userId,
        name: data.name,
        date: new Date(data.date),
        description: data.description || null,
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

    return { ...anniversary, user: buildLegacyUser(anniversary.user) };
  }

  async updateAnniversary(userId: string, id: string, data: { name?: string; date?: string; description?: string; }) {
    const membership = await getRequiredFamilyMembership(userId);
    const existing = await prisma.anniversary.findFirst({ where: { id, familyId: membership.familyId } });
    if (!existing) throw new AppError('ANNIVERSARY_NOT_FOUND', '纪念日不存在', 404);
    if (existing.userId !== userId) throw new AppError('FORBIDDEN', '只有创建人可以编辑纪念日', 403);

    const updateData: any = { ...data };
    if (data.date) updateData.date = new Date(data.date);

    const anniversary = await prisma.anniversary.update({
      where: { id },
      data: updateData,
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

    return { ...anniversary, user: buildLegacyUser(anniversary.user) };
  }

  async deleteAnniversary(userId: string, id: string) {
    const membership = await getRequiredFamilyMembership(userId);
    const existing = await prisma.anniversary.findFirst({ where: { id, familyId: membership.familyId } });
    if (!existing) throw new AppError('ANNIVERSARY_NOT_FOUND', '纪念日不存在', 404);
    if (existing.userId !== userId) throw new AppError('FORBIDDEN', '只有创建人可以删除纪念日', 403);
    await prisma.anniversary.delete({ where: { id } });
    return { success: true };
  }
}

export const anniversaryService = new AnniversaryService();
