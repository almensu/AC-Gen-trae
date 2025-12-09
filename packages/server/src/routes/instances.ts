import { Router } from 'express';
import { instanceController } from '../controllers/instanceController';

const router = Router();

router.get('/instances', instanceController.getInstances);
router.post('/instances', instanceController.upsertInstance);
router.delete('/instances/:id', instanceController.deleteInstance);

export default router;
