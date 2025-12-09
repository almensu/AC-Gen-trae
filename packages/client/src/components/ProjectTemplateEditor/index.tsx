import React, { useEffect, useState, useMemo } from 'react';
import { Card, Button, List, Typography, Tag, Empty, message, Alert, Image } from 'antd';
import { SaveOutlined, HolderOutlined } from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useProjectStore } from '../../stores/useProjectStore';
import { useAssetStore } from '../../stores/useAssetStore';
import { useCompositionStore } from '../../stores/useCompositionStore';
import { LayerOrderConfig, DecorationCategory, CompositionInput, ProductAsset, ProjectTemplate } from '@ac-gen/shared';
import { computeLayers } from '../../utils/layerMatcher';
import { CanvasViewer } from '../LayerCompositor/CanvasViewer';

const { Text } = Typography;

// Sortable Item Component
interface SortableItemProps {
  id: string;
  item: LayerOrderConfig;
  thumbnailUrl?: string;
}

const SortableItem: React.FC<SortableItemProps> = ({ id, item, thumbnailUrl }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginBottom: 8,
    border: '1px solid #d9d9d9',
    padding: '8px 12px',
    borderRadius: '4px',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'move',
  };

  const getLabel = () => {
    switch (item.type) {
      case 'background': return 'Background Layer';
      case 'product': return 'Product Layer';
      case 'price': return 'Price Text Layer';
      case 'decoration': return `Decoration: ${item.decorationCategory}`;
      default: return 'Unknown Layer';
    }
  };

  const getColor = () => {
    switch (item.type) {
      case 'background': return 'default';
      case 'product': return 'blue';
      case 'price': return 'gold';
      case 'decoration': return 'green';
      default: return 'default';
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <HolderOutlined style={{ color: '#999', cursor: 'grab' }} />
        
        {/* Thumbnail Preview */}
        <div style={{ 
          width: 40, 
          height: 40, 
          background: '#f0f0f0', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: 4,
          border: '1px solid #eee'
        }}>
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="thumb" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <Text type="secondary" style={{ fontSize: 10 }}>{item.type[0].toUpperCase()}</Text>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag color={getColor()} style={{ margin: 0 }}>{item.type.toUpperCase()}</Tag>
                <Text strong>{getLabel()}</Text>
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>Z-Index: {item.zIndex}</Text>
        </div>
      </div>
    </div>
  );
};

export const ProjectTemplateEditor: React.FC = () => {
  const { selectedProjectId, selectedProductIds, selectedEnergyLevels, selectedCapacityCodes } = useCompositionStore();
  const { projects, updateProject, fetchProjects } = useProjectStore();
  const { products, decorations, fetchDecorations, fetchProducts } = useAssetStore();
  
  const [layers, setLayers] = useState<LayerOrderConfig[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const currentProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId) || 
    projects.find(p => p.projectName === selectedProjectId), 
  [projects, selectedProjectId]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchProjects();
    fetchProducts();
  }, [fetchProjects, fetchProducts]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchDecorations(selectedProjectId);
    }
  }, [selectedProjectId, fetchDecorations]);

  // Initialize layers
  useEffect(() => {
    if (!currentProject) return;

    if (currentProject.template?.layerOrder) {
      // Use saved template, sorted by zIndex descending (Top layer first in list)
      const sorted = [...currentProject.template.layerOrder].sort((a, b) => b.zIndex - a.zIndex);
      setLayers(sorted);
    } else {
      // Generate default
      const defaultLayers: LayerOrderConfig[] = [];
      
      // 1. Price (Top)
      defaultLayers.push({ type: 'price', zIndex: 200 });

      // 2. Decorations (Middle-Top)
      const categories = Array.from(new Set(decorations.map(d => d.meta.category)));
      categories.forEach((cat, index) => {
        if (cat !== 'BACKGROUND') {
          defaultLayers.push({ 
            type: 'decoration', 
            decorationCategory: cat, 
            zIndex: 100 + index 
          });
        }
      });

      // 3. Product (Middle)
      defaultLayers.push({ type: 'product', zIndex: 50 });

      // 4. Background (Bottom)
      defaultLayers.push({ type: 'background', zIndex: 0 });

      setLayers(defaultLayers); 
    }
  }, [currentProject, decorations]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLayers((items) => {
        const oldIndex = items.findIndex((item) => `layer-${item.type}-${item.decorationCategory || ''}` === active.id);
        const newIndex = items.findIndex((item) => `layer-${item.type}-${item.decorationCategory || ''}` === over.id);
        
        const newLayers = arrayMove(items, oldIndex, newIndex);
        
        // Update Z-Index immediately based on new list order
        // List Top = Highest Z-Index
        const total = newLayers.length;
        const updatedZLayers = newLayers.map((layer, index) => ({
            ...layer,
            zIndex: (total - index) * 10,
        }));
        
        setHasUnsavedChanges(true);
        return updatedZLayers;
      });
    }
  };

  const handleSave = async () => {
    if (!currentProject) return;

    try {
      await updateProject(currentProject.id, {
        template: {
          ...currentProject.template,
          layerOrder: layers,
        }
      });
      message.success('Project template saved');
      setHasUnsavedChanges(false);
    } catch (error) {
      message.error('Failed to save template');
    }
  };

  // --- Preview Logic ---

  // 1. Select a representative product
  const previewProduct = useMemo(() => {
      if (selectedProductIds.length > 0) {
          return products.find(p => p.id === selectedProductIds[0]);
      }
      // Fallback: any product
      return products[0];
  }, [products, selectedProductIds]);

  // 2. Construct a preview input
  const previewInput = useMemo<CompositionInput | null>(() => {
      if (!currentProject || !previewProduct) return null;
      return {
          projectName: currentProject.projectName,
          productId: previewProduct.id,
          // Use selected energy/capacity if available, or fallbacks
          energyLevel: selectedEnergyLevels[0] || 'B1',
          capacityCode: selectedCapacityCodes[0] || '35',
      };
  }, [currentProject, previewProduct, selectedEnergyLevels, selectedCapacityCodes]);

  // 3. Compute layers for preview
  const previewLayers = useMemo(() => {
      if (!previewProduct || !previewInput || !currentProject) return [];
      
      // Use current 'layers' state as the template
      const tempTemplate: ProjectTemplate = {
          layerOrder: layers,
          defaultPriceConfig: currentProject.template?.defaultPriceConfig
      };

      const computed = computeLayers(
          previewProduct,
          decorations,
          previewInput,
          tempTemplate // Pass current editing state
      );
      
      console.log('Preview Layers Updated:', computed.map(l => ({ id: l.id, zIndex: l.zIndex })));
      return computed;
  }, [previewProduct, decorations, previewInput, layers, currentProject]);


  // Helper to get thumbnail for list items
  const getLayerThumbnail = (layerConfig: LayerOrderConfig) => {
      if (layerConfig.type === 'product') {
          return previewProduct ? `/storage/${previewProduct.filePath}` : undefined;
      }
      if (layerConfig.type === 'decoration' || layerConfig.type === 'background') {
          // Find a representative decoration for this category
          const cat = layerConfig.decorationCategory || (layerConfig.type === 'background' ? 'BACKGROUND' : undefined);
          if (cat) {
              const deco = decorations.find(d => d.meta.category === cat);
              return deco ? `/storage/${deco.filePath}` : undefined;
          }
      }
      return undefined;
  };

  if (!selectedProjectId) {
    return <Empty description="Please select a project first" />;
  }

  return (
    <div style={{ display: 'flex', gap: '24px', height: '100%', alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <Card 
          title="Layer Stack (Top to Bottom)" 
          extra={
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              onClick={handleSave}
              disabled={!hasUnsavedChanges}
            >
              Save Template
            </Button>
          }
        >
          <Alert 
            message="Drag items to reorder layers. Top items appear above others." 
            type="info" 
            showIcon 
            style={{ marginBottom: 16 }}
          />
          
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={layers.map(l => `layer-${l.type}-${l.decorationCategory || ''}`)}
              strategy={verticalListSortingStrategy}
            >
              {layers.map((layer) => (
                <SortableItem 
                  key={`layer-${layer.type}-${layer.decorationCategory || ''}`}
                  id={`layer-${layer.type}-${layer.decorationCategory || ''}`}
                  item={layer}
                  thumbnailUrl={getLayerThumbnail(layer)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </Card>
      </div>
      
      <div style={{ width: 500 }}>
        <Card title="Real-time Preview" bodyStyle={{ padding: 0 }}>
           {currentProject && previewLayers.length > 0 ? (
               <div style={{ position: 'relative', width: '100%', paddingTop: '100%' }}>
                   <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                        <CanvasViewer 
                            width={500} // Scale down for sidebar
                            height={500}
                            layers={previewLayers}
                            project={currentProject}
                        />
                   </div>
               </div>
           ) : (
               <Empty description="Not enough data for preview" />
           )}
           <div style={{ padding: 16, background: '#fafafa', borderTop: '1px solid #f0f0f0' }}>
               <Text type="secondary" style={{ fontSize: 12 }}>
                   Previewing: {previewProduct?.meta.series} {previewProduct?.meta.color} ({previewInput?.energyLevel}, {previewInput?.capacityCode})
               </Text>
           </div>
        </Card>
      </div>
    </div>
  );
};
