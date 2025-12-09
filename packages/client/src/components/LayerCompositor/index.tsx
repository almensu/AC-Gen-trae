import React, { useMemo, useState, useEffect } from 'react';
import { Card, List, Typography, Divider, Empty } from 'antd';
import { useCompositionStore } from '../../stores/useCompositionStore';
import { useAssetStore } from '../../stores/useAssetStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useInstanceStore } from '../../stores/useInstanceStore';
import { computeLayers } from '../../utils/layerMatcher';
import { CanvasViewer } from './CanvasViewer';
import { LayerItem, CompositionInput } from '@ac-gen/shared';

const { Text } = Typography;

export const LayerCompositor: React.FC = () => {
  const { generatedVariants, selectedProjectId } = useCompositionStore();
  const { products, decorations } = useAssetStore();
  const { projects } = useProjectStore();
  const { fetchInstances, getInstanceConfig } = useInstanceStore();

  const currentProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId), 
  [projects, selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchInstances(selectedProjectId);
    }
  }, [selectedProjectId, fetchInstances]);

  const [page, setPage] = useState(1);
  const pageSize = 5;

  const paginatedVariants = useMemo(() => {
    const start = (page - 1) * pageSize;
    return generatedVariants.slice(start, start + pageSize);
  }, [generatedVariants, page]);

  if (!selectedProjectId) {
    return <Empty description="Please select a project first" />;
  }

  if (generatedVariants.length === 0) {
    return <Empty description="No variants generated. Please go to Configuration tab and click Generate." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <List
        grid={{ gutter: 16, column: 1 }}
        dataSource={paginatedVariants}
        pagination={{
          onChange: (page) => setPage(page),
          pageSize: pageSize,
          total: generatedVariants.length,
          current: page,
        }}
        renderItem={(variant: CompositionInput) => {
          const product = products.find(p => p.id === variant.productId);
          // 如果找不到产品或项目，返回提示信息，而不是 null（导致空白）
          if (!product || !currentProject) {
             return (
               <List.Item>
                 <Card>
                   <Empty description="Missing product or project data" />
                 </Card>
               </List.Item>
             );
          }

          const instanceConfig = getInstanceConfig(
            selectedProjectId, 
            variant.productId, 
            variant.energyLevel, 
            variant.capacityCode
          );

          const layers = computeLayers(
            product, 
            decorations, 
            variant, 
            currentProject.template, 
            instanceConfig
          );

          return (
            <List.Item>
              <Card title={`${product.meta.series} - ${variant.energyLevel || 'N/A'} - ${variant.capacityCode || 'N/A'}`}>
                <div style={{ display: 'flex', gap: '24px' }}>
                  {/* 左侧：Canvas 预览 */}
                  <div style={{ width: 400, height: 400, overflow: 'hidden', position: 'relative' }}>
                     {/* 缩放容器 */}
                     <div style={{ transform: 'scale(0.5)', transformOrigin: 'top left', width: currentProject.canvasWidth, height: currentProject.canvasHeight }}>
                       <CanvasViewer 
                         width={currentProject.canvasWidth} 
                         height={currentProject.canvasHeight} 
                         layers={layers} 
                       />
                     </div>
                  </div>

                  {/* 右侧：图层列表详情 */}
                  <div style={{ flex: 1 }}>
                    <Text strong>Layers Stack (Bottom to Top):</Text>
                    <List
                      size="small"
                      dataSource={layers}
                      renderItem={(layer: LayerItem, index) => (
                        <List.Item>
                          <Text code>{index + 1}</Text> 
                          <Text type={layer.type === 'image' && layer.assetId?.startsWith('product') ? 'success' : undefined}>
                            {layer.type === 'image' ? `Image: ${layer.filePath?.split('/').pop()}` : 'Text'}
                          </Text>
                          <Divider type="vertical" />
                          <Text type="secondary">Z-Index: {layer.zIndex}</Text>
                          {(layer.x !== 0 || layer.y !== 0) && (
                            <>
                              <Divider type="vertical" />
                              <Text type="warning">Offset: ({Math.round(layer.x || 0)}, {Math.round(layer.y || 0)})</Text>
                            </>
                          )}
                        </List.Item>
                      )}
                    />
                  </div>
                </div>
              </Card>
            </List.Item>
          );
        }}
      />
    </div>
  );
};
