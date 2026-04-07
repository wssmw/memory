import { Router } from 'express';
import { photoController } from '../controllers/photoController';
import { authenticate } from '../middleware/auth';
import { createPhotoSchema, uploadPhotoSchema, validateRequest } from '../middleware/validation';

const router = Router();

router.use(authenticate);

router.get('/', photoController.getPhotos);
router.get('/banner', photoController.getBannerPhoto);
router.get('/category/:category', photoController.getPhotosByCategory);
router.post('/', validateRequest(createPhotoSchema), photoController.createPhoto);
router.post('/upload', validateRequest(uploadPhotoSchema), photoController.uploadPhoto);
router.post('/:id/delete', photoController.deletePhoto);
router.delete('/:id', photoController.deletePhoto);

export default router;
