import { Request, Response } from 'express';
import { projectService } from '../services/projectService';

export const projectController = {
  getProjects: async (req: Request, res: Response) => {
    try {
      const projects = await projectService.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  },

  createProject: async (req: Request, res: Response) => {
    try {
      const project = await projectService.createProject(req.body);
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create project' });
    }
  },

  updateProject: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const project = await projectService.updateProject(id, req.body);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update project' });
    }
  },

  deleteProject: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await projectService.deleteProject(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete project' });
    }
  },
};
