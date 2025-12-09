import { JsonDb } from '../utils/jsonDb';
import { InstanceConfig } from '@ac-gen/shared';

const instancesDb = new JsonDb<InstanceConfig>('instances.json');

export const instanceService = {
  async getInstancesByProject(projectId: string): Promise<InstanceConfig[]> {
    const instances = await instancesDb.read();
    return instances.filter(i => i.projectId === projectId);
  },

  async upsertInstance(config: InstanceConfig): Promise<InstanceConfig> {
    const instances = await instancesDb.read();
    const existingIndex = instances.findIndex(i => 
      i.projectId === config.projectId && 
      i.productId === config.productId &&
      i.energyLevel === config.energyLevel &&
      i.capacityCode === config.capacityCode
    );

    if (existingIndex !== -1) {
      // Update
      const updated = { ...instances[existingIndex], ...config, updatedAt: new Date().toISOString() };
      await instancesDb.update(i => i.id === updated.id, updated);
      return updated;
    } else {
      // Create
      const newInstance = { 
        ...config, 
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await instancesDb.add(newInstance);
      return newInstance;
    }
  },

  async deleteInstance(id: string): Promise<void> {
    await instancesDb.delete(i => i.id === id);
  }
};
