import prisma from '../database/prisma';
import { AppError } from '../middleware/errorHandler';
import { buildLegacyUser, getRequiredFamilyMembership } from '../utils/family';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'photos');
const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

function sanitizeFileName(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  const base = path.basename(fileName, ext).replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 50) || 'photo';
  return { ext, base };
}

function extensionFromContentType(contentType: string) {
  switch (contentType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      return '';
  }
}

export class PhotoService {
  async getPhotos(userId: string) {
    const membership = await getRequiredFamilyMembership(userId);

    const photos = await prisma.photo.findMany({
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

    return photos.map((photo) => ({ ...photo, user: buildLegacyUser(photo.user) }));
  }

  async getPhotosByCategory(userId: string, category: string) {
    const membership = await getRequiredFamilyMembership(userId);

    const photos = await prisma.photo.findMany({
      where: { familyId: membership.familyId, category },
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

    return photos.map((photo) => ({ ...photo, user: buildLegacyUser(photo.user) }));
  }

  async createPhoto(userId: string, data: { url: string; title?: string; category?: string; }) {
    const membership = await getRequiredFamilyMembership(userId);

    const photo = await prisma.photo.create({
      data: {
        familyId: membership.familyId,
        userId,
        url: data.url,
        title: data.title || null,
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

    return { ...photo, user: buildLegacyUser(photo.user) };
  }

  async uploadPhoto(
    userId: string,
    data: { fileName: string; fileData: string; contentType: string; title?: string; category?: string },
    requestBaseUrl: string
  ) {
    const membership = await getRequiredFamilyMembership(userId);

    if (!ALLOWED_CONTENT_TYPES.has(data.contentType)) {
      throw new AppError('UNSUPPORTED_FILE_TYPE', '仅支持 jpeg/png/webp/gif 图片', 400);
    }

    const base64Payload = data.fileData.includes(',') ? data.fileData.split(',').pop()! : data.fileData;
    const buffer = Buffer.from(base64Payload, 'base64');

    if (!buffer.length) {
      throw new AppError('INVALID_FILE', '图片内容不能为空', 400);
    }

    if (buffer.length > 5 * 1024 * 1024) {
      throw new AppError('FILE_TOO_LARGE', '图片不能超过 5MB', 400);
    }

    await ensureUploadDir();

    const { base, ext } = sanitizeFileName(data.fileName);
    const finalExt = ext || extensionFromContentType(data.contentType);
    const fileName = `${Date.now()}-${crypto.randomUUID()}-${base}${finalExt}`;
    const filePath = path.join(UPLOAD_DIR, fileName);

    await fs.writeFile(filePath, buffer);

    const url = `${requestBaseUrl}/uploads/photos/${fileName}`;

    const photo = await prisma.photo.create({
      data: {
        familyId: membership.familyId,
        userId,
        url,
        title: data.title || null,
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

    return { ...photo, user: buildLegacyUser(photo.user) };
  }

  async deletePhoto(userId: string, id: string) {
    const membership = await getRequiredFamilyMembership(userId);
    const existing = await prisma.photo.findFirst({ where: { id, familyId: membership.familyId } });
    if (!existing) throw new AppError('PHOTO_NOT_FOUND', '照片不存在', 404);
    if (existing.userId !== userId) throw new AppError('FORBIDDEN', '只有创建人可以删除照片', 403);

    if (existing.url.includes('/uploads/photos/')) {
      const fileName = existing.url.split('/uploads/photos/')[1];
      if (fileName) {
        const filePath = path.join(UPLOAD_DIR, path.basename(fileName));
        await fs.unlink(filePath).catch(() => undefined);
      }
    }

    await prisma.photo.delete({ where: { id } });
    return { success: true };
  }

  async getBannerPhoto(userId: string) {
    const membership = await getRequiredFamilyMembership(userId);
    const photo = await prisma.photo.findFirst({
      where: { familyId: membership.familyId, category: 'banner' },
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
    if (!photo) return null;
    return { ...photo, user: buildLegacyUser(photo.user) };
  }
}

export const photoService = new PhotoService();
