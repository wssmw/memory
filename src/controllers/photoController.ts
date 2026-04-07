import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { photoService } from '../services/photoService';
import { getCurrentTimestamp } from '../utils/helpers';

function getRequestBaseUrl(req: AuthRequest) {
  const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
  return `${protocol}://${req.get('host')}`;
}

export class PhotoController {
  async getPhotos(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await photoService.getPhotos(req.user!.id);
      res.status(200).json({ success: true, statusCode: 200, data: result, timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }

  async getPhotosByCategory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await photoService.getPhotosByCategory(req.user!.id, req.params.category as string);
      res.status(200).json({ success: true, statusCode: 200, data: result, timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }

  async createPhoto(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await photoService.createPhoto(req.user!.id, req.body);
      res.status(201).json({ success: true, statusCode: 201, data: result, timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }

  async uploadPhoto(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await photoService.uploadPhoto(req.user!.id, req.body, getRequestBaseUrl(req));
      res.status(201).json({ success: true, statusCode: 201, data: result, timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }

  async deletePhoto(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await photoService.deletePhoto(req.user!.id, req.params.id as string);
      res.status(200).json({ success: true, statusCode: 200, message: '删除成功', timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }

  async getBannerPhoto(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await photoService.getBannerPhoto(req.user!.id);
      res.status(200).json({ success: true, statusCode: 200, data: result, timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }
}

export const photoController = new PhotoController();
