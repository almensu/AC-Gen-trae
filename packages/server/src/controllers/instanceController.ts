import { Request, Response } from 'express';
import { instanceService } from '../services/instanceService';

export const instanceController = {
  getInstances: async (req: Request, res: Response) => {
    try {
      const { projectId } = req.query;
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      const instances = await instanceService.getInstancesByProject(String(projectId));
      res.json(instances);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch instances' });
    }
  },

  upsertInstance: async (req: Request, res: Response) => {
    try {
      const instance = await instanceService.upsertInstance(req.body);
      res.json(instance);
    } catch (error) {
      res.status(500).json({ error: 'Failed to save instance' });
    }
  },

  deleteInstance: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await instanceService.deleteInstance(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete instance' });
    }
  },
};
