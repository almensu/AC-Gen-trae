import sharp from 'sharp';
import path from 'path';
import { readPsd, writePsd, Psd } from 'ag-psd';
import { createCanvas, loadImage } from 'canvas';
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
            zIndex: getZIndex('price'),
            x: override?.promoPosition?.x ?? defaultConfig?.promoPrice?.x ?? 0,
            y: override?.promoPosition?.y ?? defaultConfig?.promoPrice?.y ?? 0,
        });
    }
  }

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
    const compositeOperations: sharp.OverlayOptions[] = [];

    for (const layer of layers) {
        if (layer.type === 'image' && layer.filePath) {
            compositeOperations.push({
                input: path.join(__dirname, '../../../../storage', layer.filePath),
                top: Math.round(layer.y || 0),
                left: Math.round(layer.x || 0),
            });
        } else if (layer.type === 'text' && layer.textContent && layer.textStyle) {
            // Server-side text rendering using SVG
            // Sharp supports SVG compositing. We create an SVG string with the text.
            const fontSize = layer.textStyle.fontSize || 24;
            const color = layer.textStyle.color || '#000000';
            const fontFamily = layer.textStyle.fontFamily || 'Arial';
            
            // Note: font support depends on the server environment. 
            // For MVP, we assume standard fonts or generic families.
            
            const svgText = `
                <svg width="${project.canvasWidth}" height="${project.canvasHeight}">
                    <style>
                        .text { 
                            font-family: "${fontFamily}", sans-serif; 
                            font-size: ${fontSize}px; 
                            fill: ${color}; 
                            font-weight: bold;
                        }
                    </style>
                    <text x="${layer.x || 0}" y="${(layer.y || 0) + fontSize}" class="text">${layer.textContent}</text>
                </svg>
            `;
            
            compositeOperations.push({
                input: Buffer.from(svgText),
                top: 0, // SVG covers whole canvas, so 0,0
                left: 0
            });
        }
    }

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
  },

  async generatePsd(
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
    
    // 3. Build PSD structure using ag-psd
    const children: any[] = [];

    // Sort layers by zIndex ascending (Bottom to Top) for PSD
    // ag-psd renders first child at bottom? No, first child is bottom in Photoshop usually.
    // Actually ag-psd documentation says: "The first element in the array is the bottom layer."
    const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of sortedLayers) {
        if (layer.type === 'image' && layer.filePath) {
            const imgPath = path.join(__dirname, '../../../../storage', layer.filePath);
            // Load image into canvas
            const img = await loadImage(imgPath);
            const canvas = createCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            children.push({
                name: layer.id,
                left: Math.round(layer.x || 0),
                top: Math.round(layer.y || 0),
                canvas: canvas, // ag-psd accepts canvas
            });
        } else if (layer.type === 'text' && layer.textContent) {
            // Text layer support is basic in ag-psd, usually rendered as raster if using canvas
            // To keep it simple and high-fidelity, we rasterize text to canvas too.
            // Or use ag-psd text features if robust.
            // Let's use rasterization for reliability.
            
            // Create a canvas for text
            // Need to estimate size
            const fontSize = layer.textStyle?.fontSize || 24;
            const canvas = createCanvas(project.canvasWidth, fontSize * 2); // Approximation
            const ctx = canvas.getContext('2d');
            
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.fillStyle = layer.textStyle?.color || '#000000';
            ctx.fillText(layer.textContent, 0, fontSize); // Draw at baseline
            
            // Trim transparent pixels? No, just place it.
            // Actually, drawing directly on a full-size transparent canvas is safer for positioning
            const fullCanvas = createCanvas(project.canvasWidth, project.canvasHeight);
            const fullCtx = fullCanvas.getContext('2d');
            fullCtx.font = `bold ${fontSize}px Arial`;
            fullCtx.fillStyle = layer.textStyle?.color || '#000000';
            fullCtx.fillText(layer.textContent, layer.x || 0, (layer.y || 0) + fontSize);
            
            children.push({
                name: layer.id,
                left: 0,
                top: 0,
                canvas: fullCanvas
            });
        }
    }

    // 4. Generate filename
    const series = product.meta.series || 'Unknown';
    const type = product.meta.acFormFactor === 'WALL' ? '挂机' : (product.meta.acFormFactor === 'CABINET' ? '柜机' : '');
    const energy = input.energyLevel || '';
    const color = product.meta.color || '';
    const capacity = input.capacityCode || '';
    
    // Construct descriptive name
    const descriptiveName = [series, type, energy, color, capacity]
      .filter(Boolean)
      .join('-');

    // Add an empty layer with the product name at the very top (end of array)
    // This acts as a label layer in Photoshop
    const emptyCanvas = createCanvas(1, 1); // minimal canvas
    children.push({
        name: descriptiveName,
        left: 0,
        top: 0,
        canvas: emptyCanvas,
        hidden: true // Hide it so it doesn't affect visual
    });

    const psd: Psd = {
        width: project.canvasWidth,
        height: project.canvasHeight,
        children: children
    };

    const buffer = writePsd(psd);
    
    const fileName = descriptiveName + '.psd';

    return {
      buffer: Buffer.from(buffer),
      fileName
    };
  }
};
