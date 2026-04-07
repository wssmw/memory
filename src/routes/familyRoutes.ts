import { Router } from 'express';
import { coupleController } from '../controllers/coupleController';
import { authenticate } from '../middleware/auth';
import { validateRequest, createCoupleSchema, joinCoupleSchema } from '../middleware/validation';

const router = Router();

router.use(authenticate);

router.post('/', validateRequest(createCoupleSchema), coupleController.createCouple);
router.post('/join', validateRequest(joinCoupleSchema), coupleController.joinCouple);
router.get('/current', coupleController.getCoupleInfo);

export default router;
