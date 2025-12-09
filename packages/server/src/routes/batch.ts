import { Router } from 'express';
import { batchController } from '../controllers/batchController';

const router = Router();

router.post('/batch/generate', batchController.generateBatch);

export default router;
