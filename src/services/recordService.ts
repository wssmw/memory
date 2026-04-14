import prisma from '../database/prisma';
import { Person } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { formatDate } from '../utils/helpers';
import { buildLegacyUser, getRequiredFamilyMembership } from '../utils/family';

export interface RecordQueryParams {
  page?: number;
  limit?: number;
  type?: 'income' | 'expense';
  startDate?: string;
  endDate?: string;
  person?: Person;
}

export interface GroupedRecordQueryParams extends RecordQueryParams {}

export class RecordService {
  async createRecord(
    userId: string,
    data: {
      amount: number;
      type: 'income' | 'expense';
      category: string;
      person: Person;
      date: string;
      note?: string;
    }
  ) {
    const membership = await getRequiredFamilyMembership(userId);

    const record = await prisma.record.create({
      data: {
        familyId: membership.familyId,
        userId,
        amount: data.amount,
        type: data.type,
        category: data.category,
        person: data.person,
        date: new Date(data.date),
        note: data.note || null,
      },
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
    });

    return {
      ...record,
      user: buildLegacyUser(record.user),
    };
  }

  async getRecords(userId: string, params: RecordQueryParams) {
    const membership = await getRequiredFamilyMembership(userId);

    const { page = 1, limit = 20, type, startDate, endDate, person } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      familyId: membership.familyId,
      deletedAt: null,
    };

    if (type) where.type = type;
    if (person) where.person = person;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [records, total] = await Promise.all([
      prisma.record.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
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
      prisma.record.count({ where }),
    ]);

    return {
      records: records.map((record) => ({
        ...record,
        user: buildLegacyUser(record.user),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRecordsGroupedByDate(userId: string, params: GroupedRecordQueryParams) {
    const membership = await getRequiredFamilyMembership(userId);

    const { page = 1, limit = 20, type, startDate, endDate, person } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      familyId: membership.familyId,
      deletedAt: null,
    };

    if (type) where.type = type;
    if (person) where.person = person;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [records, total] = await Promise.all([
      prisma.record.findMany({
        where,
        skip,
        take: limit,
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
      prisma.record.count({ where }),
    ]);

    const normalizedRecords = records.map((record) => ({
      ...record,
      user: buildLegacyUser(record.user),
    }));

    const groupedMap = new Map<string, {
      date: string;
      totalIncome: number;
      totalExpense: number;
      balance: number;
      records: typeof normalizedRecords;
    }>();

    for (const record of normalizedRecords) {
      const day = formatDate(new Date(record.date));

      if (!groupedMap.has(day)) {
        groupedMap.set(day, {
          date: day,
          totalIncome: 0,
          totalExpense: 0,
          balance: 0,
          records: [],
        });
      }

      const dayGroup = groupedMap.get(day)!;
      const amount = Number(record.amount);

      if (record.type === 'income') dayGroup.totalIncome += amount;
      else dayGroup.totalExpense += amount;

      dayGroup.balance = dayGroup.totalIncome - dayGroup.totalExpense;
      dayGroup.records.push(record);
    }

    return {
      list: Array.from(groupedMap.values()),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRecordById(userId: string, recordId: string) {
    const membership = await getRequiredFamilyMembership(userId);

    const record = await prisma.record.findFirst({
      where: {
        id: recordId,
        familyId: membership.familyId,
        deletedAt: null,
      },
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
    });

    if (!record) {
      throw new AppError('RECORD_NOT_FOUND', '记录不存在', 404);
    }

    return {
      ...record,
      user: buildLegacyUser(record.user),
    };
  }

  async updateRecord(
    userId: string,
    recordId: string,
    data: {
      amount?: number;
      type?: 'income' | 'expense';
      category?: string;
      person?: Person;
      date?: string;
      note?: string;
    }
  ) {
    const membership = await getRequiredFamilyMembership(userId);

    const existingRecord = await prisma.record.findFirst({
      where: {
        id: recordId,
        familyId: membership.familyId,
        deletedAt: null,
      },
    });

    if (!existingRecord) {
      throw new AppError('RECORD_NOT_FOUND', '记录不存在', 404);
    }

    if (existingRecord.userId !== userId) {
      throw new AppError('FORBIDDEN', '只有记录创建人可以编辑该记录', 403);
    }

    const updateData: any = { ...data };
    if (data.date) updateData.date = new Date(data.date);

    const record = await prisma.record.update({
      where: { id: recordId },
      data: updateData,
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
    });

    return {
      ...record,
      user: buildLegacyUser(record.user),
    };
  }

  async deleteRecord(userId: string, recordId: string) {
    const membership = await getRequiredFamilyMembership(userId);

    const existingRecord = await prisma.record.findFirst({
      where: {
        id: recordId,
        familyId: membership.familyId,
        deletedAt: null,
      },
    });

    if (!existingRecord) {
      throw new AppError('RECORD_NOT_FOUND', '记录不存在', 404);
    }

    if (existingRecord.userId !== userId) {
      throw new AppError('FORBIDDEN', '只有记录创建人可以删除该记录', 403);
    }

    await prisma.record.update({
      where: { id: recordId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }
}

export const recordService = new RecordService();
