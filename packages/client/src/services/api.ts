import axios from 'axios';
import { ProductAsset, DecorationAsset, Project, CompositionInput, InstanceConfig } from '@ac-gen/shared';

const API_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
});

export const assetApi = {
  // Products
  getProducts: async () => {
    const response = await api.get<ProductAsset[]>('/products');
    return response.data;
  },

  uploadProduct: async (formData: FormData) => {
    const response = await api.post<ProductAsset>('/products', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteProduct: async (id: string) => {
    await api.delete(`/products/${id}`);
  },

  // Decorations
  getDecorations: async (projectId?: string) => {
    const response = await api.get<DecorationAsset[]>('/decorations', {
      params: { projectId },
    });
    return response.data;
  },

  uploadDecoration: async (formData: FormData) => {
    const response = await api.post<DecorationAsset>('/decorations', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteDecoration: async (id: string) => {
    await api.delete(`/decorations/${id}`);
  },
};

export const projectApi = {
  getProjects: async () => {
    const response = await api.get<Project[]>('/projects');
    return response.data;
  },

  createProject: async (data: Omit<Project, 'id' | 'createdAt'>) => {
    const response = await api.post<Project>('/projects', data);
    return response.data;
  },

  updateProject: async (id: string, data: Partial<Project>) => {
    const response = await api.put<Project>(`/projects/${id}`, data);
    return response.data;
  },

  deleteProject: async (id: string) => {
    await api.delete(`/projects/${id}`);
  },
};

export const instanceApi = {
  getInstances: async (projectId: string) => {
    const response = await api.get<InstanceConfig[]>('/instances', {
      params: { projectId }
    });
    return response.data;
  },

  upsertInstance: async (config: InstanceConfig) => {
    const response = await api.post<InstanceConfig>('/instances', config);
    return response.data;
  },

  deleteInstance: async (id: string) => {
    await api.delete(`/instances/${id}`);
  },
};

export const batchApi = {
  generateBatch: async (variants: CompositionInput[]) => {
    const response = await api.post('/batch/generate', { variants }, {
      responseType: 'blob', // Important for downloading ZIP
    });
    return response.data;
  },
};
