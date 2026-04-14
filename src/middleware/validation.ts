import { Request, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { AppError } from './errorHandler';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../config/constants';

export function validateRequest(schema: z.ZodTypeAny) {
  return async (req: Request, _res: unknown, next: NextFunction) => {
    try {
      await schema.parseAsync(req.body);
      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        const message = error.issues[0]?.message || '验证失败';
        next(new AppError('VALIDATION_ERROR', message, 400));
      } else {
        next(error);
      }
    }
  };
}

const dateStringSchema = z.string().refine(
  (val) => {
    const date = new Date(val);
    return !Number.isNaN(date.getTime());
  },
  { message: '日期格式不正确' }
);

const PERSON_VALUES = z.enum(['husband', 'wife', 'father', 'mother', 'son', 'daughter', 'grandfather', 'grandmother', 'other']);
const FAMILY_ROLE_VALUES = z.enum(['husband', 'wife', 'father', 'mother', 'son', 'daughter', 'grandfather', 'grandmother', 'other']);

export const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少需要 6 个字符'),
  name: z.string().min(1, '昵称不能为空').max(50, '昵称最多 50 个字符'),
});

export const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '密码不能为空'),
});

export const createRecordSchema = z.object({
  amount: z
    .number()
    .positive('金额必须大于 0')
    .refine(
      (val) => /^\d+(\.\d{1,2})?$/.test(val.toString()),
      '金额最多 2 位小数'
    ),
  type: z.enum(['income', 'expense']),
  category: z.string().refine(
    (val) => EXPENSE_CATEGORIES.includes(val) || INCOME_CATEGORIES.includes(val),
    {
      message: '分类不在预定义列表中',
    }
  ),
  person: PERSON_VALUES,
  date: z.string().refine(
    (val) => {
      const date = new Date(val);
      return !Number.isNaN(date.getTime()) && date <= new Date();
    },
    {
      message: '日期不能晚于当前日期',
    }
  ),
  note: z.string().max(500, '备注最多 500 个字符').optional(),
});

export const updateRecordSchema = z.object({
  amount: z
    .number()
    .positive('金额必须大于 0')
    .refine(
      (val) => /^\d+(\.\d{1,2})?$/.test(val.toString()),
      '金额最多 2 位小数'
    )
    .optional(),
  type: z.enum(['income', 'expense']).optional(),
  category: z
    .string()
    .refine(
      (val) => EXPENSE_CATEGORIES.includes(val) || INCOME_CATEGORIES.includes(val),
      '分类不在预定义列表中'
    )
    .optional(),
  person: PERSON_VALUES.optional(),
  date: z.string().refine(
    (val) => {
      const date = new Date(val);
      return !Number.isNaN(date.getTime()) && date <= new Date();
    },
    '日期不能晚于当前日期'
  ).optional(),
  note: z.string().max(500, '备注最多 500 个字符').optional(),
});

export const joinFamilySchema = z.object({
  inviteCode: z.string().length(6, '邀请码必须是 6 位'),
  role: FAMILY_ROLE_VALUES,
});

export const createFamilySchema = z.object({
  role: FAMILY_ROLE_VALUES,
});

export const createDiarySchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题最多 100 个字符'),
  content: z.string().min(1, '内容不能为空'),
  location: z.string().max(100, '地点最多 100 个字符').optional(),
  mood: z.string().max(50, '心情最多 50 个字符').optional(),
  image: z.string().url('图片地址格式不正确').optional(),
});

export const updateDiarySchema = createDiarySchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: '至少提供一个需要更新的字段' }
);

export const createPhotoSchema = z.object({
  url: z.string().url('照片地址格式不正确'),
  title: z.string().max(100, '标题最多 100 个字符').optional(),
  category: z.string().max(50, '分类最多 50 个字符').optional(),
});

export const uploadPhotoSchema = z.object({
  fileName: z.string().min(1, '文件名不能为空').max(255, '文件名过长'),
  fileData: z.string().min(1, '文件内容不能为空'),
  contentType: z.string().regex(/^image\//, '仅支持图片文件'),
  title: z.string().max(100, '标题最多 100 个字符').optional(),
  category: z.string().max(50, '分类最多 50 个字符').optional(),
});

export const createWishSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100, '标题最多 100 个字符'),
  description: z.string().max(1000, '描述最多 1000 个字符').optional(),
  price: z.number().nonnegative('价格不能小于 0').optional(),
  category: z.string().max(50, '分类最多 50 个字符').optional(),
});

export const updateWishSchema = createWishSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: '至少提供一个需要更新的字段' }
);

export const updateWishStatusSchema = z.object({
  status: z.enum(['pending', 'completed']),
});

export const createAnniversarySchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100, '名称最多 100 个字符'),
  date: dateStringSchema,
  description: z.string().max(1000, '描述最多 1000 个字符').optional(),
});

export const updateAnniversarySchema = z.object({
  name: z.string().min(1, '名称不能为空').max(100, '名称最多 100 个字符').optional(),
  date: dateStringSchema.optional(),
  description: z.string().max(1000, '描述最多 1000 个字符').optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: '至少提供一个需要更新的字段',
});
