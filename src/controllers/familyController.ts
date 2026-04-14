import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { familyService } from '../services/familyService';
import { getCurrentTimestamp } from '../utils/helpers';

export class FamilyController {
  async createFamily(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { role } = req.body;
      const result = await familyService.createFamily(userId, role);

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

  async joinFamily(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { inviteCode, role } = req.body;

      const result = await familyService.joinFamily(userId, inviteCode, role);

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

  async getFamilyInfo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      const result = await familyService.getFamilyInfo(userId);

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

  async removeMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const memberId = req.params.memberId;
      const result = await familyService.removeMember(userId, memberId);

      res.status(200).json({
        success: true,
        statusCode: 200,
        data: result,
        message: '成员移除成功',
        timestamp: getCurrentTimestamp(),
      });
    } catch (error) {
      next(error);
    }
  }

  async leaveFamily(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await familyService.leaveFamily(userId);

      res.status(200).json({
        success: true,
        statusCode: 200,
        data: result,
        message: result.disbanded ? '你已退出并解散家庭' : '你已退出家庭',
        timestamp: getCurrentTimestamp(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const familyController = new FamilyController();
