import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { diaryService } from '../services/diaryService';
import { getCurrentTimestamp } from '../utils/helpers';

export class DiaryController {
  async getDiaries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await diaryService.getDiaries(req.user!.id);
      res.status(200).json({ success: true, statusCode: 200, data: result, timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }

  async getDiaryById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await diaryService.getDiaryById(req.user!.id, req.params.id as string);
      res.status(200).json({ success: true, statusCode: 200, data: result, timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }

  async createDiary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await diaryService.createDiary(req.user!.id, req.body);
      res.status(201).json({ success: true, statusCode: 201, data: result, timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }

  async updateDiary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await diaryService.updateDiary(req.user!.id, req.params.id as string, req.body);
      res.status(200).json({ success: true, statusCode: 200, data: result, timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }

  async deleteDiary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await diaryService.deleteDiary(req.user!.id, req.params.id as string);
      res.status(200).json({ success: true, statusCode: 200, message: '删除成功', timestamp: getCurrentTimestamp() });
    } catch (error) {
      next(error);
    }
  }
}

export const diaryController = new DiaryController();
