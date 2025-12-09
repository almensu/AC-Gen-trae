import { CompositionInput, EnergyLevelCode, CapacityCode, ProductAsset } from '@ac-gen/shared';

/**
 * 计算笛卡尔积，生成所有可能的组合
 * 
 * 输入:
 * - projectName: "haier_2025"
 * - products: ProductAsset[] (包含元数据，如 meta.energyLevels, meta.capacityCodes)
 * - energyLevels: ["B1", "B3"] (用户勾选的)
 * - capacityCodes: ["26", "35", "50", "72"] (用户勾选的)
 * 
 * 输出:
 * 过滤后的合法组合。
 * 例如：如果产品A只支持 ["26", "35"]，那么即使用户勾选了 50，也不应该为产品A生成 50 的变体。
 */
export function generateCompositionVariants(
  projectName: string,
  products: ProductAsset[],
  selectedEnergyLevels: EnergyLevelCode[],
  selectedCapacityCodes: CapacityCode[]
): CompositionInput[] {
  const variants: CompositionInput[] = [];

  if (products.length === 0) return [];

  // 如果用户没有选择任何能效/匹数，默认视为全部（或者空）
  // 但为了安全起见，如果不选，循环就无法进行，所以需要处理 undefined 情况
  const userEnergyLevels = selectedEnergyLevels.length > 0 ? selectedEnergyLevels : [undefined];
  const userCapacityCodes = selectedCapacityCodes.length > 0 ? selectedCapacityCodes : [undefined];

  for (const product of products) {
    const { energyLevels: productEnergyLevels, capacityCodes: productCapacityCodes } = product.meta;

    for (const energyLevel of userEnergyLevels) {
      // 校验 1：如果产品定义了适用能效范围，且当前生成的能效不在范围内，跳过
      if (
        energyLevel && 
        productEnergyLevels && 
        productEnergyLevels.length > 0 && 
        !productEnergyLevels.includes(energyLevel)
      ) {
        continue;
      }

      for (const capacityCode of userCapacityCodes) {
        // 校验 2：如果产品定义了适用匹数范围，且当前生成的匹数不在范围内，跳过
        if (
          capacityCode && 
          productCapacityCodes && 
          productCapacityCodes.length > 0 && 
          !productCapacityCodes.includes(capacityCode)
        ) {
          continue;
        }

        variants.push({
          projectName,
          productId: product.id,
          energyLevel: energyLevel as EnergyLevelCode | undefined,
          capacityCode: capacityCode as CapacityCode | undefined,
        });
      }
    }
  }

  return variants;
}
