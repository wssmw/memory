import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { buildLegacyUser, getRequiredFamilyMembership } from '../utils/family';

export class DiaryService {
  async getDiaries(userId: string) {
    const membership = await getRequiredFamilyMembership(userId);

    const diaries = await prisma.diary.findMany({
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

    return diaries.map((diary) => ({ ...diary, user: buildLegacyUser(diary.user) }));
  }

  async getDiaryById(userId: string, id: string) {
    const membership = await getRequiredFamilyMembership(userId);

    const diary = await prisma.diary.findFirst({
      where: { id, familyId: membership.familyId },
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

    if (!diary) throw new AppError('DIARY_NOT_FOUND', '日记不存在', 404);
    return { ...diary, user: buildLegacyUser(diary.user) };
  }

  async createDiary(userId: string, data: { title: string; content: string; location?: string; mood?: string; image?: string; }) {
    const membership = await getRequiredFamilyMembership(userId);

    const diary = await prisma.diary.create({
      data: {
        familyId: membership.familyId,
        userId,
        title: data.title,
        content: data.content,
        location: data.location || null,
        mood: data.mood || null,
        image: data.image || null,
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

    return { ...diary, user: buildLegacyUser(diary.user) };
  }

  async updateDiary(userId: string, id: string, data: { title?: string; content?: string; location?: string; mood?: string; image?: string; }) {
    const membership = await getRequiredFamilyMembership(userId);

    const existing = await prisma.diary.findFirst({ where: { id, familyId: membership.familyId } });
    if (!existing) throw new AppError('DIARY_NOT_FOUND', '日记不存在', 404);
    if (existing.userId !== userId) throw new AppError('FORBIDDEN', '只有创建人可以编辑日记', 403);

    const diary = await prisma.diary.update({
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

    return { ...diary, user: buildLegacyUser(diary.user) };
  }

  async deleteDiary(userId: string, id: string) {
    const membership = await getRequiredFamilyMembership(userId);

    const existing = await prisma.diary.findFirst({ where: { id, familyId: membership.familyId } });
    if (!existing) throw new AppError('DIARY_NOT_FOUND', '日记不存在', 404);
    if (existing.userId !== userId) throw new AppError('FORBIDDEN', '只有创建人可以删除日记', 403);

    await prisma.diary.delete({ where: { id } });
    return { success: true };
  }
}

export const diaryService = new DiaryService();
