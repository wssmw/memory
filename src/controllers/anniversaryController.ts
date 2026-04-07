import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { anniversaryService } from '../services/anniversaryService';
import { getCurrentTimestamp } from '../utils/helpers';

export class AnniversaryController {
  async getAnniversaries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await anniversaryService.getAnniversaries(req.user!.id);
      res.status(200).json({ success: true, statusCode: 200, data: result, timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }

  async createAnniversary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await anniversaryService.createAnniversary(req.user!.id, req.body);
      res.status(201).json({ success: true, statusCode: 201, data: result, timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }

  async updateAnniversary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await anniversaryService.updateAnniversary(req.user!.id, req.params.id as string, req.body);
      res.status(200).json({ success: true, statusCode: 200, data: result, timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }

  async deleteAnniversary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await anniversaryService.deleteAnniversary(req.user!.id, req.params.id as string);
      res.status(200).json({ success: true, statusCode: 200, message: '删除成功', timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }
}

export const anniversaryController = new AnniversaryController();
