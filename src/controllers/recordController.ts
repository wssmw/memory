import { Response, NextFunction } from 'express';
import { Person } from '@prisma/client';
import { AuthRequest } from '../types';
import { recordService, RecordQueryParams } from '../services/recordService';
import { getCurrentTimestamp } from '../utils/helpers';

export class RecordController {
  async createRecord(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      const result = await recordService.createRecord(userId, req.body);

      res.status(201).json({
        success: true,
        statusCode: 201,
        data: result,
        message: '记账记录创建成功',
        timestamp: getCurrentTimestamp(),
      });
    } catch (error) {
      next(error);
    }
  }

  async getRecords(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const params: RecordQueryParams = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        type: req.query.type as 'income' | 'expense' | undefined,
        startDate: req.query.start_date as string | undefined,
        endDate: req.query.end_date as string | undefined,
        person: req.query.person as Person | undefined,
      };

      const result = await recordService.getRecords(userId, params);

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

  async getRecordsGroupedByDate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const params: RecordQueryParams = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        type: req.query.type as 'income' | 'expense' | undefined,
        startDate: req.query.start_date as string | undefined,
        endDate: req.query.end_date as string | undefined,
        person: req.query.person as Person | undefined,
      };

      const result = await recordService.getRecordsGroupedByDate(userId, params);

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

  async getRecordById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const result = await recordService.getRecordById(userId, id as string);

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

  async updateRecord(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const result = await recordService.updateRecord(userId, id as string, req.body);

      res.status(200).json({
        success: true,
        statusCode: 200,
        data: result,
        message: '记账记录更新成功',
        timestamp: getCurrentTimestamp(),
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteRecord(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      await recordService.deleteRecord(userId, id as string);

      res.status(200).json({
        success: true,
        statusCode: 200,
        message: '记账记录删除成功',
        timestamp: getCurrentTimestamp(),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const recordController = new RecordController();