import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';

export async function getRequiredFamilyMembership(userId: string) {
  const membership = await prisma.familyMember.findFirst({
    where: {
      userId,
      status: 'active',
    },
    orderBy: {
      joinedAt: 'asc',
    },
  });

  if (!membership) {
    throw new AppError('NOT_IN_COUPLE', '用户未加入家庭', 400);
  }

  return membership;
}

export function buildLegacyUser(user: {
  id: string;
  name: string;
  familyMembers?: { familyId: string; role: string | null }[];
}) {
  const membership = user.familyMembers?.[0];

  return {
    id: user.id,
    name: user.name,
    role: membership?.role ?? null,
    coupleId: membership?.familyId ?? null,
    familyId: membership?.familyId ?? null,
  };
}
