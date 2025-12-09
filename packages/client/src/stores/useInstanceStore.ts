import { create } from 'zustand';
import { instanceApi } from '../services/api';
import { InstanceConfig } from '@ac-gen/shared';

interface InstanceState {
  instances: InstanceConfig[];
  loading: boolean;
  error: string | null;

  fetchInstances: (projectId: string) => Promise<void>;
  upsertInstance: (config: InstanceConfig) => Promise<void>;
  deleteInstance: (id: string) => Promise<void>;
  
  // Helper to get config for a specific variant
  getInstanceConfig: (
    projectId: string, 
    productId: string, 
    energyLevel?: string, 
    capacityCode?: string
  ) => InstanceConfig | undefined;
}

export const useInstanceStore = create<InstanceState>((set, get) => ({
  instances: [],
  loading: false,
  error: null,

  fetchInstances: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const instances = await instanceApi.getInstances(projectId);
      set({ instances, loading: false });
    } catch (error) {
      set({ loading: false, error: 'Failed to fetch instances' });
    }
  },

  upsertInstance: async (config) => {
    set({ loading: true, error: null });
    try {
      const saved = await instanceApi.upsertInstance(config);
      set((state) => {
        const index = state.instances.findIndex(i => i.id === saved.id);
        if (index !== -1) {
          const newInstances = [...state.instances];
          newInstances[index] = saved;
          return { instances: newInstances, loading: false };
        } else {
          return { instances: [...state.instances, saved], loading: false };
        }
      });
    } catch (error) {
      set({ loading: false, error: 'Failed to save instance' });
      throw error;
    }
  },

  deleteInstance: async (id) => {
    set({ loading: true, error: null });
    try {
      await instanceApi.deleteInstance(id);
      set((state) => ({
        instances: state.instances.filter((i) => i.id !== id),
        loading: false,
      }));
    } catch (error) {
      set({ loading: false, error: 'Failed to delete instance' });
    }
  },

  getInstanceConfig: (projectId, productId, energyLevel, capacityCode) => {
    return get().instances.find(i => 
      i.projectId === projectId && 
      i.productId === productId && 
      i.energyLevel === energyLevel && 
      i.capacityCode === capacityCode
    );
  }
}));
