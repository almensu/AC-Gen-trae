import { Router } from 'express';
import { projectController } from '../controllers/projectController';

const router = Router();

router.get('/projects', projectController.getProjects);
router.post('/projects', projectController.createProject);
router.post('/projects/:id/duplicate', projectController.duplicateProject);
router.put('/projects/:id', projectController.updateProject);
router.delete('/projects/:id', projectController.deleteProject);

export default router;
