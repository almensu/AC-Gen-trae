import axios from 'axios';
import { ProductAsset, DecorationAsset } from '@ac-gen/shared';

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
