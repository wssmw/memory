import { Router } from 'express';
import { diaryController } from '../controllers/diaryController';
import { authenticate } from '../middleware/auth';
import { createDiarySchema, updateDiarySchema, validateRequest } from '../middleware/validation';

const router = Router();

router.use(authenticate);

router.get('/', diaryController.getDiaries);
router.get('/:id', diaryController.getDiaryById);
router.post('/', validateRequest(createDiarySchema), diaryController.createDiary);
router.post('/:id/update', validateRequest(updateDiarySchema), diaryController.updateDiary);
router.post('/:id/delete', diaryController.deleteDiary);
router.put('/:id', validateRequest(updateDiarySchema), diaryController.updateDiary);
router.delete('/:id', diaryController.deleteDiary);

export default router;
