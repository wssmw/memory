import { Router } from 'express';
import authRoutes from './authRoutes';
import familyRoutes from './familyRoutes';
import recordRoutes from './recordRoutes';
import statisticsRoutes from './statisticsRoutes';
import diaryRoutes from './diaryRoutes';
import photoRoutes from './photoRoutes';
import wishRoutes from './wishRoutes';
import anniversaryRoutes from './anniversaryRoutes';

const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/families', familyRoutes);
apiRoutes.use('/records', recordRoutes);
apiRoutes.use('/statistics', statisticsRoutes);
apiRoutes.use('/diaries', diaryRoutes);
apiRoutes.use('/photos', photoRoutes);
apiRoutes.use('/wishes', wishRoutes);
apiRoutes.use('/anniversaries', anniversaryRoutes);

export default apiRoutes;
