import { Router } from 'express';
import { anniversaryController } from '../controllers/anniversaryController';
import { authenticate } from '../middleware/auth';
import { createAnniversarySchema, updateAnniversarySchema, validateRequest } from '../middleware/validation';

const router = Router();

router.use(authenticate);

router.get('/', anniversaryController.getAnniversaries);
router.post('/', validateRequest(createAnniversarySchema), anniversaryController.createAnniversary);
router.post('/:id/update', validateRequest(updateAnniversarySchema), anniversaryController.updateAnniversary);
router.post('/:id/delete', anniversaryController.deleteAnniversary);
router.put('/:id', validateRequest(updateAnniversarySchema), anniversaryController.updateAnniversary);
router.delete('/:id', anniversaryController.deleteAnniversary);

export default router;
