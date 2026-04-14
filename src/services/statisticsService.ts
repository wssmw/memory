import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { Prisma } from '@prisma/client';

async function getActiveFamilyMembership(userId: string) {
  return prisma.familyMember.findFirst({
    where: {
      userId,
      status: 'active',
    },
    orderBy: {
      joinedAt: 'asc',
    },
  });
}

function buildLegacyUser(user: {
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

export class StatisticsService {
  async getHomeOverview(userId: string, recentLimit: number = 10) {
    const membership = await getActiveFamilyMembership(userId);

    if (!membership) {
      throw new AppError('NOT_IN_COUPLE', '用户未加入家庭', 400);
    }

    const where: any = {
      familyId: membership.familyId,
      deletedAt: null,
    };

    const [incomeResult, expenseResult, recentRecords] = await Promise.all([
      prisma.record.aggregate({
        where: { ...where, type: 'income' },
        _sum: { amount: true },
      }),
      prisma.record.aggregate({
        where: { ...where, type: 'expense' },
        _sum: { amount: true },
      }),
      prisma.record.findMany({
        where,
        take: recentLimit,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: {
          user: {
            select: {
              id: true,
              name: true,
              familyMembers: {
                where: {
                  familyId: membership.familyId,
                  status: 'active',
                },
                select: {
                  familyId: true,
                  role: true,
                },
                take: 1,
              },
            },
          },
        },
      }),
    ]);

    const totalIncome = Number(incomeResult._sum.amount) || 0;
    const totalExpense = Number(expenseResult._sum.amount) || 0;
    const balance = totalIncome - totalExpense;

    return {
      balance,
      totalIncome,
      totalExpense,
      recentRecords: recentRecords.map((record) => ({
        ...record,
        user: buildLegacyUser(record.user),
      })),
    };
  }

  async getSummary(userId: string, startDate?: string, endDate?: string) {
    const membership = await getActiveFamilyMembership(userId);

    if (!membership) {
      throw new AppError('NOT_IN_COUPLE', '用户未加入家庭', 400);
    }

    const where: any = {
      familyId: membership.familyId,
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const incomeResult = await prisma.record.aggregate({
      where: { ...where, type: 'income' },
      _sum: { amount: true },
    });

    const expenseResult = await prisma.record.aggregate({
      where: { ...where, type: 'expense' },
      _sum: { amount: true },
    });

    const totalIncome = Number(incomeResult._sum.amount) || 0;
    const totalExpense = Number(expenseResult._sum.amount) || 0;
    const balance = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      balance,
      startDate: startDate || null,
      endDate: endDate || null,
    };
  }

  async getByCategory(userId: string, startDate?: string, endDate?: string) {
    const membership = await getActiveFamilyMembership(userId);

    if (!membership) {
      throw new AppError('NOT_IN_COUPLE', '用户未加入家庭', 400);
    }

    const where: any = {
      familyId: membership.familyId,
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const expenseCategories = await prisma.record.groupBy({
      by: ['category'],
      where: { ...where, type: 'expense' },
      _sum: { amount: true },
      _count: true,
    });

    const incomeCategories = await prisma.record.groupBy({
      by: ['category'],
      where: { ...where, type: 'income' },
      _sum: { amount: true },
      _count: true,
    });

    return {
      expense: expenseCategories.map((cat) => ({
        category: cat.category,
        totalAmount: Number(cat._sum.amount) || 0,
        count: cat._count,
      })),
      income: incomeCategories.map((cat) => ({
        category: cat.category,
        totalAmount: Number(cat._sum.amount) || 0,
        count: cat._count,
      })),
    };
  }

  async getByPerson(userId: string, startDate?: string, endDate?: string) {
    const membership = await getActiveFamilyMembership(userId);

    if (!membership) {
      throw new AppError('NOT_IN_COUPLE', '用户未加入家庭', 400);
    }

    const where: Prisma.RecordWhereInput = {
      familyId: membership.familyId,
      deletedAt: null,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    const grouped = await prisma.record.groupBy({
      by: ['person', 'type'],
      where,
      _sum: { amount: true },
      _count: true,
    });

    const familyMembers = await prisma.familyMember.findMany({
      where: {
        familyId: membership.familyId,
        status: 'active',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ joinedAt: 'asc' }],
    });

    const statsMap = new Map<string, {
      role: string;
      name: string;
      totalIncome: number;
      totalExpense: number;
      count: number;
    }>();

    familyMembers.forEach((member) => {
      const role = member.role || 'other';
      if (!statsMap.has(role)) {
        statsMap.set(role, {
          role,
          name: member.user.name || '家庭成员',
          totalIncome: 0,
          totalExpense: 0,
          count: 0,
        });
      }
    });

    grouped.forEach((item) => {
      const role = item.person;
      if (!statsMap.has(role)) {
        statsMap.set(role, {
          role,
          name: role === 'other' ? '其他成员' : role,
          totalIncome: 0,
          totalExpense: 0,
          count: 0,
        });
      }

      const current = statsMap.get(role)!;
      const amount = Number(item._sum.amount) || 0;
      current.count += item._count;
      if (item.type === 'income') {
        current.totalIncome += amount;
      } else {
        current.totalExpense += amount;
      }
    });

    return {
      members: Array.from(statsMap.values()),
    };
  }

  async getByMonth(userId: string, year?: number) {
    const membership = await getActiveFamilyMembership(userId);

    if (!membership) {
      throw new AppError('NOT_IN_COUPLE', '用户未加入家庭', 400);
    }

    const currentYear = year || new Date().getFullYear();
    const startDate = new Date(`${currentYear}-01-01`);
    const endDate = new Date(`${currentYear}-12-31`);

    const where: any = {
      familyId: membership.familyId,
      deletedAt: null,
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    const records = await prisma.record.findMany({
      where,
      select: {
        date: true,
        amount: true,
        type: true,
      },
    });

    const monthlyData = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: 0,
      expense: 0,
    }));

    records.forEach((record) => {
      const month = new Date(record.date).getMonth();
      if (record.type === 'income') {
        monthlyData[month].income += Number(record.amount);
      } else {
        monthlyData[month].expense += Number(record.amount);
      }
    });

    return {
      year: currentYear,
      months: monthlyData,
    };
  }
}

export const statisticsService = new StatisticsService();
