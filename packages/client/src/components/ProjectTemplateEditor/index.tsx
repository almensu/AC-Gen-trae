import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, Button, List, Typography, Tag, Empty, message, Alert, Image, Tooltip, Space, Radio, Select } from 'antd';
import { SaveOutlined, HolderOutlined, ReloadOutlined, UndoOutlined } from '@ant-design/icons';
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
      case 'decoration': {
        if (item.decorationId) {
             // Try to find the asset to show a better name?
             // Or just show ID for now
             // Better: "Decoration: OTHER (Asset-ID)"
             // Ideally we would pass decorations list to this component to lookup name, 
             // but for now let's just show it's a specific asset
             return `Decoration: ${item.decorationCategory} (Specific Asset)`;
        }
        return `Decoration: ${item.decorationCategory}`;
      }
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
  const [previewMode, setPreviewMode] = useState<'WALL' | 'CABINET' | 'LIFE'>('WALL');

  const currentProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId) || 
    projects.find(p => p.projectName === selectedProjectId), 
  [projects, selectedProjectId]);

  // Filter decorations for current project to be safe
  const projectDecorations = useMemo(() => {
      if (!currentProject) return [];
      return decorations.filter(d => d.meta.projectName === currentProject.projectName);
  }, [decorations, currentProject]);

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

  // Recalculate layers logic
  const refreshLayers = useCallback((useSavedTemplate = true) => {
    if (!currentProject) return;

    // 1. Get existing layers from saved template (if requested and exists)
    let initialLayers: LayerOrderConfig[] = [];
    
    if (useSavedTemplate && currentProject.template?.layerOrder) {
      initialLayers = [...currentProject.template.layerOrder];
    }

    // 2. Identify all required categories from current decorations
    const allCategories = Array.from(new Set(projectDecorations.map(d => d.meta.category)));
    console.log('ProjectTemplateEditor: All Categories found in assets:', allCategories);
    
    // 3. Check for missing categories
    const existingCategories = new Set(
        initialLayers
            .filter(l => l.type === 'decoration')
            .map(l => l.decorationCategory)
    );
    
    const missingCategories = allCategories.filter(cat => cat !== 'BACKGROUND' && !existingCategories.has(cat));
    console.log('ProjectTemplateEditor: Missing Categories to add:', missingCategories);
    
    // 4. Also check for standard layers if starting fresh or they are missing
    const hasProduct = initialLayers.some(l => l.type === 'product');
    const hasPrice = initialLayers.some(l => l.type === 'price');
    const hasBackground = initialLayers.some(l => l.type === 'background');

    let newLayers = [...initialLayers];

    // Add missing standard layers if empty (first init)
    if (newLayers.length === 0) {
        if (!hasPrice) newLayers.push({ type: 'price', zIndex: 200 });
        if (!hasProduct) newLayers.push({ type: 'product', zIndex: 50 });
        if (!hasBackground) newLayers.push({ type: 'background', zIndex: 0 });
    }

    // Add missing decoration categories (defaulting to top)
    if (missingCategories.length > 0) {
        missingCategories.forEach((cat, index) => {
             // Special handling for OTHER: check if we should split them by asset
             // But for now, user requested explicit splitting.
             if (cat === 'OTHER') {
                 // Do not add generic 'OTHER' category if we are going to add specific assets
                 // But wait, existing logic is category-based.
             }

             // Find highest current zIndex to place on top
             const maxZ = newLayers.length > 0 ? Math.max(...newLayers.map(l => l.zIndex)) : 100;
             newLayers.push({
                 type: 'decoration',
                 decorationCategory: cat,
                 zIndex: maxZ + 10 + (index * 10)
             });
        });
    }
    
    // NEW LOGIC: Handle splitting 'OTHER' category into individual asset layers
    // 1. Find all assets in 'OTHER' category
    const otherAssets = projectDecorations.filter(d => d.meta.category === 'OTHER');
    
    if (otherAssets.length > 0) {
        // 2. Remove the generic 'OTHER' category layer if it exists
        // (We replace it with specific asset layers)
        const genericOtherIndex = newLayers.findIndex(l => l.decorationCategory === 'OTHER' && !l.decorationId);
        let baseZIndex = 100;
        
        if (genericOtherIndex !== -1) {
            baseZIndex = newLayers[genericOtherIndex].zIndex;
            newLayers.splice(genericOtherIndex, 1);
        }

        // 3. Add a layer for EACH 'OTHER' asset if not already present
        otherAssets.forEach((asset, idx) => {
            const exists = newLayers.some(l => l.decorationId === asset.id);
            if (!exists) {
                newLayers.push({
                    type: 'decoration',
                    decorationCategory: 'OTHER',
                    decorationId: asset.id, // Specific asset binding
                    zIndex: baseZIndex + idx // Stack them slightly apart
                });
            }
        });
    }

    // 5. Sort by zIndex descending (Top layer first in list)
    const sorted = newLayers.sort((a, b) => b.zIndex - a.zIndex);
    
    setLayers(sorted);
    // If we added new layers significantly different from saved, we could set unsaved changes, 
    // but usually auto-discovery is just display logic until saved.
  }, [currentProject, projectDecorations]);

  // Initialize layers on mount or change
  useEffect(() => {
      refreshLayers(true);
  }, [refreshLayers]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLayers((items) => {
        const oldIndex = items.findIndex((item) => `layer-${item.type}-${item.decorationCategory || ''}-${item.decorationId || ''}` === active.id);
        const newIndex = items.findIndex((item) => `layer-${item.type}-${item.decorationCategory || ''}-${item.decorationId || ''}` === over.id);
        
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

  // 1. Select a representative product based on mode
  const previewProduct = useMemo(() => {
      // Filter by mode
      const filtered = products.filter(p => {
          if (previewMode === 'WALL') return p.meta.category === 'AC' && p.meta.acFormFactor === 'WALL';
          if (previewMode === 'CABINET') return p.meta.category === 'AC' && p.meta.acFormFactor === 'CABINET';
          if (previewMode === 'LIFE') return p.meta.category === 'LIFE_APPLIANCE';
          return false;
      });

      // If no product found for mode, fallback to any product but warn user visually
      if (filtered.length === 0) return null;
      
      return filtered[0];
  }, [products, previewMode]);

  // 2. Construct a preview input
  const previewInput = useMemo<CompositionInput | null>(() => {
      if (!currentProject || !previewProduct) return null;
      return {
          projectName: currentProject.projectName,
          productId: previewProduct.id,
          // Use product's available energy/capacity if possible
          energyLevel: previewProduct.meta.energyLevels?.[0] || 'B1',
          capacityCode: previewProduct.meta.capacityCodes?.[0] || '35',
      };
  }, [currentProject, previewProduct]);

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
          // New logic: Check if it's bound to a specific asset ID first
          if (layerConfig.decorationId) {
             const specificDeco = decorations.find(d => d.id === layerConfig.decorationId);
             return specificDeco ? `/storage/${specificDeco.filePath}` : undefined;
          }

          // Fallback: Find a representative decoration for this category
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
            <Space>
                <Tooltip title="Reload from assets (find new layers)">
                    <Button icon={<ReloadOutlined />} onClick={() => refreshLayers(true)} />
                </Tooltip>
                <Tooltip title="Reset to default">
                    <Button icon={<UndoOutlined />} onClick={() => refreshLayers(false)} />
                </Tooltip>
                <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                >
                Save Template
                </Button>
            </Space>
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
            <div style={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto', paddingRight: 8 }}>
              <SortableContext 
                items={layers.map(l => `layer-${l.type}-${l.decorationCategory || ''}-${l.decorationId || ''}`)}
                strategy={verticalListSortingStrategy}
              >
                {layers.map((layer) => (
                  <SortableItem 
                    key={`layer-${layer.type}-${layer.decorationCategory || ''}-${layer.decorationId || ''}`}
                    id={`layer-${layer.type}-${layer.decorationCategory || ''}-${layer.decorationId || ''}`}
                    item={layer}
                    thumbnailUrl={getLayerThumbnail(layer)}
                  />
                ))}
              </SortableContext>
            </div>
          </DndContext>
        </Card>
      </div>
      
      <div style={{ width: 500 }}>
        <Card 
          title="Real-time Preview" 
          bodyStyle={{ padding: 0 }}
          extra={
              <Radio.Group 
                  value={previewMode} 
                  onChange={e => setPreviewMode(e.target.value)}
                  size="small"
                  buttonStyle="solid"
              >
                  <Radio.Button value="WALL">AC Wall</Radio.Button>
                  <Radio.Button value="CABINET">AC Cabinet</Radio.Button>
                  <Radio.Button value="LIFE">Life Appliance</Radio.Button>
              </Radio.Group>
          }
        >
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
               <Empty description="No product found for selected type" />
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
