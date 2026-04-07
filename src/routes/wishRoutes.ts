import { Router } from 'express';
import { wishController } from '../controllers/wishController';
import { authenticate } from '../middleware/auth';
import { createWishSchema, updateWishSchema, updateWishStatusSchema, validateRequest } from '../middleware/validation';

const router = Router();

router.use(authenticate);

router.get('/', wishController.getWishes);
router.post('/', validateRequest(createWishSchema), wishController.createWish);
router.post('/:id/update', validateRequest(updateWishSchema), wishController.updateWish);
router.post('/:id/status', validateRequest(updateWishStatusSchema), wishController.updateWishStatus);
router.post('/:id/delete', wishController.deleteWish);
router.put('/:id', validateRequest(updateWishSchema), wishController.updateWish);
router.put('/:id/status', validateRequest(updateWishStatusSchema), wishController.updateWishStatus);
router.delete('/:id', wishController.deleteWish);

export default router;
