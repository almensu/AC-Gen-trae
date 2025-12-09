import { create } from 'zustand';
import { assetApi } from '../services/api';
import { ProductAsset, DecorationAsset } from '@ac-gen/shared';

interface AssetState {
  products: ProductAsset[];
  decorations: DecorationAsset[];
  loading: boolean;
  error: string | null;

  fetchProducts: () => Promise<void>;
  uploadProduct: (formData: FormData) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  fetchDecorations: (projectId?: string) => Promise<void>;
  uploadDecoration: (formData: FormData) => Promise<void>;
  deleteDecoration: (id: string) => Promise<void>;
}

export const useAssetStore = create<AssetState>((set, get) => ({
  products: [],
  decorations: [],
  loading: false,
  error: null,

  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const products = await assetApi.getProducts();
      set({ products, loading: false });
    } catch (error) {
      set({ loading: false, error: 'Failed to fetch products' });
    }
  },

  uploadProduct: async (formData: FormData) => {
    set({ loading: true, error: null });
    try {
      const product = await assetApi.uploadProduct(formData);
      set((state) => ({ products: [...state.products, product], loading: false }));
    } catch (error) {
      set({ loading: false, error: 'Upload failed' });
      throw error;
    }
  },

  deleteProduct: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await assetApi.deleteProduct(id);
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({ loading: false, error: 'Failed to delete product' });
    }
  },

  fetchDecorations: async (projectId?: string) => {
    set({ loading: true, error: null });
    try {
      const decorations = await assetApi.getDecorations(projectId);
      set({ decorations, loading: false });
    } catch (error) {
      set({ loading: false, error: 'Failed to fetch decorations' });
    }
  },

  uploadDecoration: async (formData: FormData) => {
    set({ loading: true, error: null });
    try {
      const decoration = await assetApi.uploadDecoration(formData);
      set((state) => ({ decorations: [...state.decorations, decoration], loading: false }));
    } catch (error) {
      set({ loading: false, error: 'Upload failed' });
      throw error;
    }
  },

  deleteDecoration: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await assetApi.deleteDecoration(id);
      set((state) => ({
        decorations: state.decorations.filter((d) => d.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({ loading: false, error: 'Failed to delete decoration' });
    }
  },
}));
