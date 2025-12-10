import { Request, Response } from 'express';
import { projectService } from '../services/projectService';
import { assetService } from '../services/assetService';

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

  duplicateProject: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { projectName, displayName } = req.body;

      // 1. Get source project
      const sourceProject = await projectService.getProjectById(id);
      if (!sourceProject) {
        return res.status(404).json({ error: 'Source project not found' });
      }

      // 2. Create new project
      // Omit id and createdAt, use new name/displayName
      // Also ensure linkedProductIds are copied
      const { id: _id, createdAt: _createdAt, ...rest } = sourceProject;
      const newProjectData = {
        ...rest,
        projectName,
        displayName
      };
      const newProject = await projectService.createProject(newProjectData);

      // 3. Duplicate decorations
      // sourceProject.projectName is the key for decorations
      await assetService.duplicateDecorations(sourceProject.projectName, newProject.projectName);

      res.status(201).json(newProject);
    } catch (error) {
      console.error('Duplicate project error:', error);
      res.status(500).json({ error: 'Failed to duplicate project' });
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
