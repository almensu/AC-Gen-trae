// ========== 基础类型 ==========
export type EnergyLevelCode = 'B1' | 'B3';
export type CapacityCode = '26' | '35' | '50' | '72' | '100';

// ========== 产品图（公用资产） ==========
export type ProductCategory = 'AC' | 'LIFE_APPLIANCE'; // 空调 | 生活电器
export type AcFormFactor = 'WALL' | 'CABINET';         // 挂机 | 柜机

export type ProductAssetMeta = {
  category: ProductCategory;
  
  // 仅当 category === 'AC' 时必填
  acFormFactor?: AcFormFactor;

  series: string;          // 例如：天丽
  color: string;           // 例如：皓雪白 (原 colorTheme 拆分为 series + color)

  // 适用范围匹配规则：
  // 1. 空调 (AC)：energyLevels 和 capacityCodes 通常必填
  // 2. 生活电器 (LIFE_APPLIANCE)：这两个字段通常为空 (null/undefined)
  energyLevels?: EnergyLevelCode[];
  capacityCodes?: CapacityCode[];
};

export type ProductAsset = {
  id: string;
  filePath: string;        // products/天丽_白.png
  meta: ProductAssetMeta;
};

// ========== 装饰图（项目专属） ==========
export type DecorationCategory = 
  | 'BACKGROUND'      // 背景底图
  | 'ENERGY_BADGE'    // 能效角标
  | 'CAPACITY_BADGE'  // 匹数角标
  | 'BRAND_LOGO'      // 品牌Logo
  | 'OTHER';          // 其他装饰 (PNG)

export type DecorationAssetMeta = {
  projectName: string;     // 必填，绑定项目
  category: DecorationCategory;
  energyLevels?: EnergyLevelCode[];
  capacityCodes?: CapacityCode[];
  zIndex?: number;         // 图层顺序
};

// ========== 价格样式配置 (项目级/模板级) ==========
// 价格不是 PNG 图片，而是渲染的文本图层
export type PriceLayerConfig = {
  x: number;
  y: number;
  fontFamily: string;
  fontSize: number;
  color: string;
  projectId: string; // 关联项目
};

export type DecorationAsset = {
  id: string;
  filePath: string;
  meta: DecorationAssetMeta;
};

// ========== 项目 ==========
export type LayerOrderConfig = {
  type: 'background' | 'product' | 'decoration' | 'price';
  // 如果是 decoration，需指定具体是哪个装饰图类别
  decorationCategory?: DecorationCategory;
  zIndex: number;
};

export type ProjectTemplate = {
  // 项目级默认图层顺序（用户在"项目级预览"中拖拽调整保存）
  layerOrder: LayerOrderConfig[];
  
  // 项目级默认价格配置（可被实例覆盖）
  defaultPriceConfig?: {
    originalPrice: PriceLayerConfig;
    promoPrice: PriceLayerConfig;
  };
};

export type Project = {
  id: string;
  projectName: string;     // 格力_2025_q1
  displayName: string;     // 格力2025年Q1活动
  canvasWidth: number;
  canvasHeight: number;
  createdAt: string;
  template?: ProjectTemplate;
};

// ========== 实例配置（实例微调） ==========
export type DecorationAdjustment = {
  decorationId: string;
  // 相对于原始位置的偏移量
  offsetX: number;
  offsetY: number;
};

export type InstanceConfig = {
  id: string;
  projectId: string;
  
  // 实例标识（唯一组合）
  productId: string;
  energyLevel?: EnergyLevelCode;
  capacityCode?: CapacityCode;
  
  // ========== 实例专属调整 ==========
  // 价格文本覆盖
  priceOverride?: {
    original: string;
    promo: string;
    // 可选：调整价格文本位置（覆盖项目默认）
    originalPosition?: { x: number; y: number };
    promoPosition?: { x: number; y: number };
  };
  
  // 装饰图位置微调（相对于项目默认）
  decorationAdjustments?: DecorationAdjustment[];
  
  createdAt: string;
  updatedAt: string;
};

// ========== 组合输入 ==========
export type CompositionInput = {
  projectName: string;
  productId: string;
  energyLevel?: EnergyLevelCode;
  capacityCode?: CapacityCode;
  // 可选：动态文本
  priceOriginalText?: string;
  pricePromoText?: string;
};

// ========== 渲染输出 ==========
export type LayerItem = {
  id: string;
  type: 'image' | 'text';
  // image 属性
  assetId?: string;
  filePath?: string;
  // text 属性
  textContent?: string;
  textStyle?: PriceLayerConfig;
  
  zIndex: number;
  x?: number;
  y?: number;
};

export type CompositionOutput = {
  // 命名规范：<系列>-<形态>-<能效>-<色彩>-<匹数>.png
  fileName: string;
  layers: LayerItem[];
  // Blob 在后端可能不直接使用，前端使用 Blob，后端可能用 Buffer 或 Stream
  // 为了共享类型，这里先保持通用，或者暂不定义 Blob
};
