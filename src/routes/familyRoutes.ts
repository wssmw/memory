import { Router } from 'express';
import { familyController } from '../controllers/familyController';
import { authenticate } from '../middleware/auth';
import { validateRequest, createFamilySchema, joinFamilySchema } from '../middleware/validation';

const router = Router();

router.use(authenticate);

router.post('/', validateRequest(createFamilySchema), familyController.createFamily);
router.post('/join', validateRequest(joinFamilySchema), familyController.joinFamily);
router.get('/current', familyController.getFamilyInfo);
router.delete('/members/:memberId', familyController.removeMember);
router.post('/leave', familyController.leaveFamily);

export default router;
