import { Router } from 'express';
import analysisRouter from './analysis.route';

const router = Router();
router.use('/analysis', analysisRouter);

export default router;