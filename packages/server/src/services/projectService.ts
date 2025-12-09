import { JsonDb } from '../utils/jsonDb';
import { Project } from '@ac-gen/shared';

const projectsDb = new JsonDb<Project>('projects.json');

export const projectService = {
  async getAllProjects(): Promise<Project[]> {
    return projectsDb.read();
  },

  async createProject(data: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
    const project: Project = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      ...data,
    };
    await projectsDb.add(project);
    return project;
  },

  async updateProject(id: string, data: Partial<Project>): Promise<Project | null> {
    const projects = await projectsDb.read();
    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const updatedProject = { ...projects[index], ...data };
    await projectsDb.update((p) => p.id === id, updatedProject);
    return updatedProject;
  },

  async deleteProject(id: string): Promise<void> {
    await projectsDb.delete((p) => p.id === id);
  },

  async getProjectById(id: string): Promise<Project | undefined> {
    const projects = await projectsDb.read();
    return projects.find((p) => p.id === id);
  },
};
