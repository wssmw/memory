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

async function getFamilyWithActiveMembers(familyId: string) {
  return prisma.family.findUnique({
    where: { id: familyId },
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
}

function toLegacyUser(user: {
  id: string;
  email: string;
  name: string;
  createdAt?: Date;
  membership?: {
    id?: string;
    familyId: string;
    role: string | null;
    permissionRole?: string | null;
  } | null;
}) {
  return {
    id: user.id,
    memberId: user.membership?.id ?? null,
    email: user.email,
    name: user.name,
    role: user.membership?.role ?? null,
    permissionRole: user.membership?.permissionRole ?? null,
    coupleId: user.membership?.familyId ?? null,
    familyId: user.membership?.familyId ?? null,
    ...(user.createdAt ? { createdAt: user.createdAt } : {}),
  };
}

function buildFamilyResponse(family: NonNullable<Awaited<ReturnType<typeof getFamilyWithActiveMembers>>>) {
  return {
    id: family.id,
    inviteCode: family.inviteCode,
    familyName: family.name,
    maxMembers: family.maxMembers,
    users: family.members.map((member) =>
      toLegacyUser({
        ...member.user,
        membership: {
          id: member.id,
          familyId: member.familyId,
          role: member.role,
          permissionRole: member.permissionRole,
        },
      })
    ),
    createdAt: family.createdAt,
  };
}

async function requireOwnerMembership(userId: string) {
  const membership = await getActiveFamilyMembership(userId);

  if (!membership) {
    throw new AppError('NOT_IN_FAMILY', '用户未加入家庭', 404);
  }

  if (membership.permissionRole !== 'owner') {
    throw new AppError('FORBIDDEN', '仅家庭创建者可执行此操作', 403);
  }

  return membership;
}

export class FamilyService {
  async createFamily(userId: string, role: FamilyRole) {
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
      throw new AppError('ALREADY_IN_FAMILY', '用户已加入家庭', 400);
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
            permissionRole: 'owner',
            status: 'active',
          },
        },
      },
    });

    const createdFamily = await getFamilyWithActiveMembers(family.id);
    return buildFamilyResponse(createdFamily!);
  }

  async joinFamily(userId: string, inviteCode: string, role: FamilyRole) {
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
      throw new AppError('ALREADY_IN_FAMILY', '用户已加入家庭', 400);
    }

    const family = await getFamilyWithActiveMembersByInviteCode(inviteCode);

    if (!family) {
      throw new AppError('INVALID_INVITE_CODE', '邀请码无效', 404);
    }

    if (family.members.length >= family.maxMembers) {
      throw new AppError('FAMILY_FULL', '家庭已满员', 400);
    }

    await prisma.familyMember.create({
      data: {
        familyId: family.id,
        userId,
        role,
        permissionRole: 'member',
        status: 'active',
      },
    });

    const updatedFamily = await getFamilyWithActiveMembers(family.id);
    return buildFamilyResponse(updatedFamily!);
  }

  async getFamilyInfo(userId: string) {
    const membership = await getActiveFamilyMembership(userId);

    if (!membership) {
      throw new AppError('NOT_IN_FAMILY', '用户未加入家庭', 404);
    }

    const family = await getFamilyWithActiveMembers(membership.familyId);

    if (!family) {
      throw new AppError('FAMILY_NOT_FOUND', '家庭不存在', 404);
    }

    return buildFamilyResponse(family);
  }

  async removeMember(userId: string, memberId: string) {
    const ownerMembership = await requireOwnerMembership(userId);

    const targetMember = await prisma.familyMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.status !== 'active' || targetMember.familyId !== ownerMembership.familyId) {
      throw new AppError('MEMBER_NOT_FOUND', '家庭成员不存在', 404);
    }

    if (targetMember.userId === userId) {
      throw new AppError('CANNOT_REMOVE_SELF', '不能移除自己，请使用退出家庭功能', 400);
    }

    await prisma.familyMember.update({
      where: { id: targetMember.id },
      data: {
        status: 'removed',
      },
    });

    const family = await getFamilyWithActiveMembers(ownerMembership.familyId);
    return buildFamilyResponse(family!);
  }

  async leaveFamily(userId: string) {
    const membership = await getActiveFamilyMembership(userId);

    if (!membership) {
      throw new AppError('NOT_IN_FAMILY', '用户未加入家庭', 404);
    }

    const family = await getFamilyWithActiveMembers(membership.familyId);

    if (!family) {
      throw new AppError('FAMILY_NOT_FOUND', '家庭不存在', 404);
    }

    const otherActiveMembers = family.members.filter((member) => member.userId !== userId);

    if (membership.permissionRole === 'owner' && otherActiveMembers.length > 0) {
      throw new AppError('OWNER_CANNOT_LEAVE', '家庭创建者退出前请先转让权限', 400);
    }

    await prisma.familyMember.update({
      where: { id: membership.id },
      data: {
        status: 'removed',
      },
    });

    if (otherActiveMembers.length === 0) {
      await prisma.family.update({
        where: { id: family.id },
        data: {
          status: 'archived',
        },
      });

      return {
        disbanded: true,
        familyId: family.id,
      };
    }

    return {
      disbanded: false,
      family: buildFamilyResponse((await getFamilyWithActiveMembers(family.id))!),
    };
  }
}

async function getFamilyWithActiveMembersByInviteCode(inviteCode: string) {
  return prisma.family.findUnique({
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
}

export const familyService = new FamilyService();
