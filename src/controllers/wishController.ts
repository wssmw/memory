import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { wishService } from '../services/wishService';
import { getCurrentTimestamp } from '../utils/helpers';

export class WishController {
  async getWishes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await wishService.getWishes(req.user!.id);
      res.status(200).json({ success: true, statusCode: 200, data: result, timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }

  async createWish(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await wishService.createWish(req.user!.id, req.body);
      res.status(201).json({ success: true, statusCode: 201, data: result, timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }

  async updateWish(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await wishService.updateWish(req.user!.id, req.params.id as string, req.body);
      res.status(200).json({ success: true, statusCode: 200, data: result, timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }

  async updateWishStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await wishService.updateWishStatus(req.user!.id, req.params.id as string, req.body.status);
      res.status(200).json({ success: true, statusCode: 200, data: result, timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }

  async deleteWish(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await wishService.deleteWish(req.user!.id, req.params.id as string);
      res.status(200).json({ success: true, statusCode: 200, message: '删除成功', timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }
}

export const wishController = new WishController();
