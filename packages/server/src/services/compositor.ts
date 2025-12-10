import sharp from 'sharp';
import path from 'path';
import { CompositionInput, LayerItem, ProductAsset, DecorationAsset, Project, ProjectTemplate, InstanceConfig, DecorationCategory } from '@ac-gen/shared';
import { assetService } from './assetService';
import { projectService } from './projectService';

// Logic replicated from client/src/utils/layerMatcher.ts
function computeLayersServer(
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

  // Product layer
  layers.push({
    id: `product-${product.id}`,
    type: 'image',
    assetId: product.id,
    filePath: product.filePath,
    zIndex: getZIndex('product'),
    x: 0,
    y: 0,
  });

  // Decoration layers
  const matchedDecorations = decorations.filter(deco => {
    const { projectName, energyLevels, capacityCodes } = deco.meta;

    if (projectName !== input.projectName) return false;

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

  return layers.sort((a, b) => a.zIndex - b.zIndex);
}

export const compositorService = {
  async generateImage(
    input: CompositionInput, 
    project: Project,
    instanceConfig?: InstanceConfig
  ): Promise<{ buffer: Buffer; fileName: string }> {
    // 1. Fetch assets
    const allProducts = await assetService.getAllProducts();
    const product = allProducts.find(p => p.id === input.productId);
    
    if (!product) {
      throw new Error(`Product not found: ${input.productId}`);
    }

    const allDecorations = await assetService.getAllDecorations();
    
    // 2. Compute layers
    const layers = computeLayersServer(product, allDecorations, input, project.template, instanceConfig);
    
    // 3. Composite with Sharp
    const compositeOperations = layers.map(layer => {
      if (layer.type === 'image' && layer.filePath) {
        return {
          input: path.join(__dirname, '../../../../storage', layer.filePath),
          top: Math.round(layer.y || 0),
          left: Math.round(layer.x || 0),
        };
      }
      return null;
    }).filter(Boolean) as sharp.OverlayOptions[];

    // Create base canvas
    // Note: Sharp needs a base image or create one.
    // We can create a transparent background.
    const base = sharp({
      create: {
        width: project.canvasWidth,
        height: project.canvasHeight,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    });

    const outputBuffer = await base
      .composite(compositeOperations)
      .png()
      .toBuffer();

    // 4. Generate filename
    // Format: <Series>-<Type>-<Energy>-<Color>-<Capacity>.png
    // e.g. 天丽-挂机-B3-皓雪白-26.png
    const series = product.meta.series || 'Unknown';
    const type = product.meta.acFormFactor === 'WALL' ? '挂机' : (product.meta.acFormFactor === 'CABINET' ? '柜机' : '');
    const energy = input.energyLevel || '';
    const color = product.meta.color || '';
    const capacity = input.capacityCode || '';
    
    // Filter out empty strings and join
    const fileName = [series, type, energy, color, capacity]
      .filter(Boolean)
      .join('-') + '.png';

    return {
      buffer: outputBuffer,
      fileName
    };
  }
};
