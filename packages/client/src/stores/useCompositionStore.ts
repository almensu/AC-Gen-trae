import { create } from 'zustand';
import { CompositionInput, EnergyLevelCode, CapacityCode } from '@ac-gen/shared';
import { generateCompositionVariants } from '../utils/cartesian';
import { useAssetStore } from './useAssetStore';

interface CompositionState {
  selectedProjectId: string | null;
  selectedProductIds: string[];
  selectedEnergyLevels: EnergyLevelCode[];
  selectedCapacityCodes: CapacityCode[];
  
  generatedVariants: CompositionInput[];

  setProjectId: (id: string) => void;
  setSelectedProductIds: (ids: string[]) => void;
  setSelectedEnergyLevels: (levels: EnergyLevelCode[]) => void;
  setSelectedCapacityCodes: (codes: CapacityCode[]) => void;
  
  generateVariants: () => void;
  reset: () => void;
}

export const useCompositionStore = create<CompositionState>((set, get) => ({
  selectedProjectId: null,
  selectedProductIds: [],
  selectedEnergyLevels: [],
  selectedCapacityCodes: [],
  generatedVariants: [],

  setProjectId: (id) => set({ selectedProjectId: id }),
  setSelectedProductIds: (ids) => set({ selectedProductIds: ids }),
  setSelectedEnergyLevels: (levels) => set({ selectedEnergyLevels: levels }),
  setSelectedCapacityCodes: (codes) => set({ selectedCapacityCodes: codes }),

  generateVariants: () => {
    const { 
      selectedProjectId, 
      selectedProductIds, 
      selectedEnergyLevels, 
      selectedCapacityCodes 
    } = get();

    if (!selectedProjectId) return;

    // 从 Asset Store 获取完整的产品信息以进行校验
    // 注意：这里需要直接访问 useAssetStore 的状态
    // 由于我们是在另一个 store 内部，可以通过 useAssetStore.getState() 获取
    const allProducts = useAssetStore.getState().products;
    
    // 筛选出选中的产品对象
    const selectedProducts = allProducts.filter(p => selectedProductIds.includes(p.id));

    const variants = generateCompositionVariants(
      selectedProjectId,
      selectedProducts, // 传入完整对象数组，而非 ID 数组
      selectedEnergyLevels,
      selectedCapacityCodes
    );

    set({ generatedVariants: variants });
  },

  reset: () => set({
    selectedProjectId: null,
    selectedProductIds: [],
    selectedEnergyLevels: [],
    selectedCapacityCodes: [],
    generatedVariants: []
  }),
}));
