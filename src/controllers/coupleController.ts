import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { coupleService } from '../services/coupleService';
import { getCurrentTimestamp } from '../utils/helpers';

export class CoupleController {
  async createCouple(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { role } = req.body;
      const result = await coupleService.createCouple(userId, role);

      res.status(201).json({
        success: true,
        statusCode: 201,
        data: result,
        message: '家庭创建成功',
        timestamp: getCurrentTimestamp(),
      });
    } catch (error) {
      next(error);
    }
  }

  async joinCouple(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { inviteCode } = req.body;

      const result = await coupleService.joinCouple(userId, inviteCode);

      res.status(200).json({
        success: true,
        statusCode: 200,
        data: result,
        message: '加入家庭成功',
        timestamp: getCurrentTimestamp(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getCoupleInfo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      const result = await coupleService.getCoupleInfo(userId);

      res.status(200).json({
        success: true,
        statusCode: 200,
        data: result,
        timestamp: getCurrentTimestamp(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const coupleController = new CoupleController();
