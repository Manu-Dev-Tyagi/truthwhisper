import { Router } from 'express';
import { AnalysisController } from '../controllers/analysis.controller';

const router = Router();

router.post('/', AnalysisController.analyzeContent);

export default router;