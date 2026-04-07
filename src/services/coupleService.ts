import prisma from '../database/prisma';
import { FamilyRole } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { generateInviteCode } from '../utils/helpers';

async function getActiveFamilyMembership(userId: string) {
  return prisma.familyMember.findFirst({
    where: {
      userId,
      status: 'active',
    },
    include: {
      family: true,
    },
    orderBy: {
      joinedAt: 'asc',
    },
  });
}

function toLegacyUser(user: {
  id: string;
  email: string;
  name: string;
  createdAt?: Date;
  membership?: {
    familyId: string;
    role: string | null;
  } | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.membership?.role ?? null,
    coupleId: user.membership?.familyId ?? null,
    familyId: user.membership?.familyId ?? null,
    ...(user.createdAt ? { createdAt: user.createdAt } : {}),
  };
}

export class CoupleService {
  async createCouple(userId: string, role: 'husband' | 'wife') {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
    }

    const existingMembership = await getActiveFamilyMembership(userId);
    if (existingMembership) {
      throw new AppError('ALREADY_IN_COUPLE', '用户已加入家庭', 400);
    }

    let inviteCode = generateInviteCode();
    let exists = true;

    while (exists) {
      const existing = await prisma.family.findUnique({
        where: { inviteCode },
      });
      if (!existing) {
        exists = false;
      } else {
        inviteCode = generateInviteCode();
      }
    }

    const family = await prisma.family.create({
      data: {
        inviteCode,
        members: {
          create: {
            userId,
            role,
            status: 'active',
          },
        },
      },
      include: {
        members: {
          where: { status: 'active' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    return {
      id: family.id,
      inviteCode: family.inviteCode,
      familyName: family.name,
      maxMembers: family.maxMembers,
      users: family.members.map((member) =>
        toLegacyUser({
          ...member.user,
          membership: {
            familyId: member.familyId,
            role: member.role,
          },
        })
      ),
      createdAt: family.createdAt,
    };
  }

  async joinCouple(userId: string, inviteCode: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', '用户不存在', 404);
    }

    const existingMembership = await getActiveFamilyMembership(userId);
    if (existingMembership) {
      throw new AppError('ALREADY_IN_COUPLE', '用户已加入家庭', 400);
    }

    const family = await prisma.family.findUnique({
      where: { inviteCode },
      include: {
        members: {
          where: { status: 'active' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!family) {
      throw new AppError('INVALID_INVITE_CODE', '邀请码无效', 404);
    }

    if (family.members.length >= family.maxMembers) {
      throw new AppError('COUPLE_FULL', '家庭已满员', 400);
    }

    const currentRoles = family.members
      .map((member) => member.role)
      .filter((item): item is FamilyRole => item !== null);

    const createdRole = roleFromExistingMembers(currentRoles);



    await prisma.familyMember.create({
      data: {
        familyId: family.id,
        userId,
        role: createdRole,
        status: 'active',
      },
    });

    const updatedFamily = await prisma.family.findUnique({
      where: { id: family.id },
      include: {
        members: {
          where: { status: 'active' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    return {
      id: updatedFamily!.id,
      inviteCode: updatedFamily!.inviteCode,
      familyName: updatedFamily!.name,
      maxMembers: updatedFamily!.maxMembers,
      users: updatedFamily!.members.map((member) =>
        toLegacyUser({
          ...member.user,
          membership: {
            familyId: member.familyId,
            role: member.role,
          },
        })
      ),
      createdAt: updatedFamily!.createdAt,
    };
  }

  async getCoupleInfo(userId: string) {
    const membership = await getActiveFamilyMembership(userId);

    if (!membership) {
      throw new AppError('NOT_IN_COUPLE', '用户未加入家庭', 404);
    }

    const family = await prisma.family.findUnique({
      where: { id: membership.familyId },
      include: {
        members: {
          where: { status: 'active' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                createdAt: true,
              },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!family) {
      throw new AppError('COUPLE_NOT_FOUND', '家庭不存在', 404);
    }

    return {
      id: family.id,
      inviteCode: family.inviteCode,
      familyName: family.name,
      maxMembers: family.maxMembers,
      users: family.members.map((member) =>
        toLegacyUser({
          ...member.user,
          membership: {
            familyId: member.familyId,
            role: member.role,
          },
        })
      ),
      createdAt: family.createdAt,
    };
  }
}

function roleFromExistingMembers(existingRoles: FamilyRole[]): FamilyRole {
  if (!existingRoles.includes('husband')) {
    return 'husband';
  }

  if (!existingRoles.includes('wife')) {
    return 'wife';
  }

  return 'other';
}

export const coupleService = new CoupleService();
