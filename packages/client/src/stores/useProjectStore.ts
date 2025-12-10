import { create } from 'zustand';
import { projectApi } from '../services/api';
import { Project } from '@ac-gen/shared';

interface ProjectState {
  projects: Project[];
  loading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  createProject: (data: Omit<Project, 'id' | 'createdAt'>) => Promise<Project>;
  duplicateProject: (id: string, data: { projectName: string; displayName: string }) => Promise<Project>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await projectApi.getProjects();
      set({ projects, loading: false });
    } catch (error) {
      set({ loading: false, error: 'Failed to fetch projects' });
    }
  },

  createProject: async (data) => {
    set({ loading: true, error: null });
    try {
      const project = await projectApi.createProject(data);
      set((state) => ({ projects: [...state.projects, project], loading: false }));
      return project;
    } catch (error) {
      set({ loading: false, error: 'Failed to create project' });
      throw error;
    }
  },

  duplicateProject: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const project = await projectApi.duplicateProject(id, data);
      set((state) => ({ projects: [...state.projects, project], loading: false }));
      return project;
    } catch (error) {
      set({ loading: false, error: 'Failed to duplicate project' });
      throw error;
    }
  },

  updateProject: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const project = await projectApi.updateProject(id, data);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? project : p)),
        loading: false,
      }));
    } catch (error) {
      set({ loading: false, error: 'Failed to update project' });
      throw error;
    }
  },

  deleteProject: async (id) => {
    set({ loading: true, error: null });
    try {
      await projectApi.deleteProject(id);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({ loading: false, error: 'Failed to delete project' });
    }
  },
}));
