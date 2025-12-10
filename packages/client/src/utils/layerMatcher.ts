import { DecorationAsset, CompositionInput, LayerItem, ProductAsset, ProjectTemplate, InstanceConfig, DecorationCategory } from '@ac-gen/shared';

/**
 * 核心图层匹配逻辑 (Pure Function)
 * 
 * 根据输入的组合配置 (input) 和所有可用的装饰图资产 (decorations)，
 * 计算出应该展示哪些图层，以及它们的顺序。
 */
export function computeLayers(
  product: ProductAsset,
  decorations: DecorationAsset[],
  input: CompositionInput,
  projectTemplate?: ProjectTemplate,
  instanceConfig?: InstanceConfig
): LayerItem[] {
  const layers: LayerItem[] = [];

  // Helper to get zIndex from template
  const getZIndex = (type: 'background' | 'product' | 'decoration' | 'price', category?: DecorationCategory, decorationId?: string): number => {
    if (projectTemplate?.layerOrder) {
      // 1. First try to find exact match by decorationId (for specific OTHER assets)
      if (decorationId) {
        const idMatch = projectTemplate.layerOrder.find(l => l.decorationId === decorationId);
        if (idMatch) return idMatch.zIndex;
      }

      // 2. Fallback to category match (for grouped decorations)
      const config = projectTemplate.layerOrder.find(l => {
        if (l.type !== type) return false;
        
        // Skip if this config is for a specific decorationId (don't use specific config for generic category)
        if (l.decorationId) return false;

        // If it's a decoration, strictly match category
        if (type === 'decoration') {
             return l.decorationCategory === category;
        }
        // For product/background/price, just match type
        return true;
      });
      
      if (config) return config.zIndex;
    }
    // Default fallback
    if (type === 'background') return 0;
    if (type === 'product') return 50;
    if (type === 'decoration') return 100;
    if (type === 'price') return 200;
    return 0;
  };

  // 1. 添加产品图层
  layers.push({
    id: `product-${product.id}`,
    type: 'image',
    assetId: product.id,
    filePath: product.filePath,
    zIndex: getZIndex('product'),
    x: 0,
    y: 0,
  });

  // 2. 筛选并匹配装饰图
  const matchedDecorations = decorations.filter(deco => {
    const { projectName, energyLevels, capacityCodes } = deco.meta;

    if (projectName !== input.projectName) return false;

    // Special handling for LIFE_APPLIANCE products (no energy/capacity check)
    if (product.meta.category === 'LIFE_APPLIANCE') {
        // Only check if decoration is explicitly restricted (unlikely for life appliance project, but safe to keep)
        // If decoration has NO restrictions, it matches.
        // If decoration HAS restrictions, it probably belongs to AC.
        // Assumption: Decorations for Life Appliance usually have empty energy/capacity arrays.
        if ((energyLevels && energyLevels.length > 0) || (capacityCodes && capacityCodes.length > 0)) {
            return false; // This decoration is for AC (has specific AC attributes)
        }
        return true;
    }

    if (energyLevels && energyLevels.length > 0) {
      if (!input.energyLevel || !energyLevels.includes(input.energyLevel)) {
        return false;
      }
    }

    if (capacityCodes && capacityCodes.length > 0) {
      if (!input.capacityCode || !capacityCodes.includes(input.capacityCode)) {
        return false;
      }
    }

    return true;
  });

  // 3. 将匹配到的装饰图转换为图层
  matchedDecorations.forEach(deco => {
    // Apply instance adjustment
    let x = 0;
    let y = 0;
    if (instanceConfig?.decorationAdjustments) {
      const adj = instanceConfig.decorationAdjustments.find(a => a.decorationId === deco.id);
      if (adj) {
        x = adj.offsetX;
        y = adj.offsetY;
      }
    }

    layers.push({
      id: `deco-${deco.id}`,
      type: 'image',
      assetId: deco.id,
      filePath: deco.filePath,
      zIndex: getZIndex(
        deco.meta.category === 'BACKGROUND' ? 'background' : 'decoration', 
        deco.meta.category,
        deco.id
      ),
      x,
      y,
    });
  });

  // 4. 添加价格文本图层 (如果输入包含价格)
  if (input.priceOriginalText || input.pricePromoText || projectTemplate?.defaultPriceConfig) {
    const defaultConfig = projectTemplate?.defaultPriceConfig;
    const override = instanceConfig?.priceOverride;

    // 原价
    if (input.priceOriginalText || defaultConfig?.originalPrice) {
        layers.push({
            id: 'price-original',
            type: 'text',
            textContent: override?.original || input.priceOriginalText || '¥0',
            textStyle: defaultConfig?.originalPrice,
            zIndex: getZIndex('price'),
            x: override?.originalPosition?.x ?? defaultConfig?.originalPrice?.x ?? 0,
            y: override?.originalPosition?.y ?? defaultConfig?.originalPrice?.y ?? 0,
        });
    }

    // 促销价
    if (input.pricePromoText || defaultConfig?.promoPrice) {
        layers.push({
            id: 'price-promo',
            type: 'text',
            textContent: override?.promo || input.pricePromoText || '¥0',
            textStyle: defaultConfig?.promoPrice,
            zIndex: getZIndex('price'), // 假设促销价和原价在一个层级，或者可以在 template 中区分
            x: override?.promoPosition?.x ?? defaultConfig?.promoPrice?.x ?? 0,
            y: override?.promoPosition?.y ?? defaultConfig?.promoPrice?.y ?? 0,
        });
    }
  }

  // 5. 按 zIndex 排序
  return layers.sort((a, b) => a.zIndex - b.zIndex);
}
