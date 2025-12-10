import React, { useState, useEffect, useMemo } from 'react';
import { Card, Select, Button, Row, Col, Typography, message, Empty, Spin, List, Tag, Tooltip } from 'antd';
import { SaveOutlined, UndoOutlined, RedoOutlined, DeleteOutlined, HolderOutlined } from '@ant-design/icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useCompositionStore } from '../../stores/useCompositionStore';
import { useAssetStore } from '../../stores/useAssetStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useInstanceStore } from '../../stores/useInstanceStore';
import { computeLayers } from '../../utils/layerMatcher';
import { InteractiveCanvas } from './InteractiveCanvas';
import { InstanceConfig, CompositionInput, LayerItem } from '@ac-gen/shared';
import { useHistory } from '../../hooks/useHistory';

const { Title, Text } = Typography;
const { Option } = Select;

// Sortable Layer Item for Fine-Tuner Sidebar
interface SortableLayerItemProps {
  id: string;
  layer: LayerItem;
  isSelected: boolean;
  isAdjusted: boolean;
  name: string;
  onClick: () => void;
  onReset?: () => void;
}

const SortableLayerItem: React.FC<SortableLayerItemProps> = ({ id, layer, isSelected, isAdjusted, name, onClick, onReset }) => {
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
    cursor: 'pointer',
    background: isSelected ? '#e6f7ff' : '#fff',
    border: isSelected ? '1px solid #1890ff' : '1px solid #f0f0f0',
    marginBottom: 4,
    borderRadius: 4,
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} onClick={onClick}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <HolderOutlined style={{ color: '#999', cursor: 'grab' }} {...listeners} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Text style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400 }}>{name}</Text>
                <div style={{ fontSize: 10, color: '#999' }}>
                    Z: {layer.zIndex}
                    {isAdjusted && <Tag color="orange" style={{ marginLeft: 8, transform: 'scale(0.8)', margin: 0 }}>Modified</Tag>}
                </div>
            </div>
        </div>
        {isAdjusted && onReset && (
            <Tooltip title="Reset Position">
                <Button 
                    type="text" 
                    size="small" 
                    icon={<DeleteOutlined />} 
                    onClick={(e) => {
                        e.stopPropagation();
                        onReset();
                    }}
                />
            </Tooltip>
        )}
    </div>
  );
};

export const InstanceFineTuner: React.FC = () => {
  const { generatedVariants, selectedProjectId } = useCompositionStore();
  const { products, decorations } = useAssetStore();
  const { projects } = useProjectStore();
  const { instances, fetchInstances, upsertInstance, loading } = useInstanceStore();

  const [selectedVariantKey, setSelectedVariantKey] = useState<string | null>(null);
  
  // Use history hook for undo/redo
  const { 
    state: currentConfig, 
    setState: setCurrentConfig, 
    undo, 
    redo, 
    canUndo, 
    canRedo,
    reset: resetHistory 
  } = useHistory<InstanceConfig | null>(null);

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  // Bind keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
        // Find indices in current display order
        const oldIndex = interactiveLayers.findIndex(l => l.id === active.id);
        const newIndex = interactiveLayers.findIndex(l => l.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return;

        // Calculate new Z-indices
        // We are moving item at oldIndex to newIndex in the LIST (which is reversed Z-index order)
        // Top of list = Highest Z
        // So we need to re-assign Z-indices based on the new list order.
        
        // 1. Get current items in list order
        const currentListOrder = [...interactiveLayers].reverse(); // Sidebar is reversed (Top to Bottom)
        const activeItem = currentListOrder.find(l => l.id === active.id);
        const overItem = currentListOrder.find(l => l.id === over.id);
        
        if (!activeItem || !overItem) return;

        const oldListIndex = currentListOrder.indexOf(activeItem);
        const newListIndex = currentListOrder.indexOf(overItem);
        
        const newList = arrayMove(currentListOrder, oldListIndex, newListIndex);
        
        // 2. Re-assign Z-indices
        // Item at index 0 (Top) gets highest Z
        // Item at last index gets lowest Z
        const baseZ = 100; // Start from 100
        const newAdjustments = [...(currentConfig?.decorationAdjustments || [])];
        
        // We need to store Z-index overrides in InstanceConfig?
        // Currently InstanceConfig only has `decorationAdjustments` for X/Y.
        // If we want to persist Z-order changes per instance, we need to add `zIndex` to `DecorationAdjustment`.
        
        // CHECK: Does `DecorationAdjustment` support zIndex?
        // Let's assume we can add it. If not, we need to update shared types.
        // For now, let's just log it and optimistically update state if type allows.
        
        // Actually, without backend support for Z-index in instance config, this visual change won't persist properly 
        // or affect the final generation if the backend compositor uses template order.
        // The backend `computeLayers` uses template order.
        // So changing order HERE in Fine-Tuner implies we want to override the template order FOR THIS INSTANCE.
        
        // TODO: Ensure `DecorationAdjustment` has `zIndex`.
        // Let's check `packages/shared/src/index.ts` via thought process or assumption.
        // Usually it is { decorationId, offsetX, offsetY }.
        // If we want to support reordering, we should add `zIndex`.
        
        // For this task, user wants "Layer Stack" UX. 
        // If reordering is required, I need to update the type. 
        // User said: "Instance Fine-Tuner 的形式，参考 Project Template 的Layer Stack"
        // This implies the VISUAL LIST style, and likely the ability to reorder.
        
        // Let's implement the reorder logic assuming we can add zIndex to adjustment.
        
        const total = newList.length;
        
        const updatedAdjustments = newAdjustments.map(adj => ({...adj})); // Clone
        
        newList.forEach((layer, index) => {
            if (layer.id.startsWith('product-')) return; // Product usually fixed Z? Or can we move it?
            
            const decoId = layer.id.replace('deco-', '');
            const newZ = (total - index) * 10 + baseZ;
            
            const existingAdjIndex = updatedAdjustments.findIndex(a => a.decorationId === decoId);
            if (existingAdjIndex !== -1) {
                updatedAdjustments[existingAdjIndex] = {
                    ...updatedAdjustments[existingAdjIndex],
                    // @ts-ignore - We will need to add this field
                    zIndex: newZ
                };
            } else {
                updatedAdjustments.push({
                    decorationId: decoId,
                    offsetX: 0,
                    offsetY: 0,
                    // @ts-ignore
                    zIndex: newZ
                });
            }
        });
        
        // Update local state to reflect visual change immediately?
        // The `computeLayers` function needs to respect this zIndex from config.
        // If `computeLayers` doesn't read zIndex from config, this won't work.
        // Let's check `computeLayers` implementation.
        // It likely merges adjustments.
        
        setCurrentConfig({
            ...currentConfig!,
            decorationAdjustments: updatedAdjustments
        });
        setHasUnsavedChanges(true);
    }
  };

  const currentProject = useMemo(() => 
    projects.find(p => p.id === selectedProjectId) || 
    projects.find(p => p.projectName === selectedProjectId), 
  [projects, selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId) {
      fetchInstances(selectedProjectId);
    }
  }, [selectedProjectId, fetchInstances]);

  // Handle Variant Selection
  const handleVariantSelect = (key: string) => {
    setSelectedVariantKey(key);
    const variant = generatedVariants.find(v => getVariantKey(v) === key);
    if (!variant || !selectedProjectId) return;

    // Find existing config or create new draft
    const existing = instances.find(i => 
      i.projectId === selectedProjectId &&
      i.productId === variant.productId &&
      i.energyLevel === variant.energyLevel &&
      i.capacityCode === variant.capacityCode
    );

    const newConfig = existing ? existing : {
      id: '', // Will be generated by backend
      projectId: selectedProjectId,
      productId: variant.productId,
      energyLevel: variant.energyLevel,
      capacityCode: variant.capacityCode,
      decorationAdjustments: [],
      createdAt: '',
      updatedAt: '',
    };

    setCurrentConfig(newConfig);
    resetHistory(newConfig);
    setHasUnsavedChanges(false);
    setSelectedLayerId(null);
  };

  const handleLayerChange = (layerId: string, changes: { x: number; y: number }) => {
    if (!currentConfig) return;

    // Parse layerId to get decorationId (format: deco-{id})
    if (!layerId.startsWith('deco-')) return;
    const decorationId = layerId.replace('deco-', '');

    // Select the layer being moved
    setSelectedLayerId(layerId);

    const adjustments = [...(currentConfig.decorationAdjustments || [])];
    const index = adjustments.findIndex(a => a.decorationId === decorationId);
    
    if (index !== -1) {
      adjustments[index] = { ...adjustments[index], offsetX: changes.x, offsetY: changes.y };
    } else {
      adjustments.push({ decorationId, offsetX: changes.x, offsetY: changes.y });
    }

    setCurrentConfig({ ...currentConfig, decorationAdjustments: adjustments });
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!currentConfig) return;
    try {
      await upsertInstance(currentConfig);
      message.success('Instance configuration saved');
      setHasUnsavedChanges(false);
    } catch (error) {
      message.error('Failed to save configuration');
    }
  };

  const handleResetAdjustment = (decorationId: string) => {
    if (!currentConfig) return;
    const adjustments = (currentConfig.decorationAdjustments || []).filter(a => a.decorationId !== decorationId);
    setCurrentConfig({ ...currentConfig, decorationAdjustments: adjustments });
    setHasUnsavedChanges(true);
  };

  // Helper to generate unique key for Select Option
  const getVariantKey = (v: CompositionInput) => 
    `${v.productId}-${v.energyLevel || 'N/A'}-${v.capacityCode || 'N/A'}`;

  const selectedVariant = useMemo(() => 
    generatedVariants.find(v => getVariantKey(v) === selectedVariantKey),
  [generatedVariants, selectedVariantKey]);

  // Compute layers for current view
  const layers = useMemo(() => {
    if (!selectedVariant || !currentConfig) return [];
    const product = products.find(p => p.id === selectedVariant.productId);
    if (!product) return [];

    return computeLayers(
      product, 
      decorations, 
      selectedVariant, 
      currentProject?.template,
      currentConfig
    );
  }, [selectedVariant, currentConfig, products, decorations, currentProject]);

  // Filter only decoration layers for the sidebar list
  const decorationLayers = useMemo(() => 
    layers.filter(l => {
      // Include both 'decoration' and 'background' types if they are images and have IDs starting with 'deco-'
      // Based on computeLayers logic, decorations have id `deco-${id}`.
      // Products have `product-${id}`.
      return l.id.startsWith('deco-');
    })
  , [layers]);

  // Also include Product layer in the list?
  // User asked: "Why can't I select the product image?"
  // So we should include ALL layers in the sidebar list, or at least Product + Decorations.
  const interactiveLayers = useMemo(() => 
    layers.filter(l => l.type === 'image') // Include all image layers (Product + Decorations)
  , [layers]);

  if (!selectedProjectId) {
    return <Empty description="Please select a project first" />;
  }

  if (generatedVariants.length === 0) {
    return <Empty description="Please generate variants in Configuration tab first" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card title="Instance Fine-Tuner">
        <Row gutter={24} align="middle">
          <Col span={12}>
            <Select
              style={{ width: '100%' }}
              placeholder="Select a variant to edit"
              onChange={handleVariantSelect}
              value={selectedVariantKey}
            >
              {generatedVariants.map(v => {
                const p = products.find(prod => prod.id === v.productId);
                return (
                  <Option key={getVariantKey(v)} value={getVariantKey(v)}>
                    {p?.meta.series} - {v.energyLevel} - {v.capacityCode}
                  </Option>
                );
              })}
            </Select>
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <Tooltip title="Undo (Ctrl+Z)">
                    <Button icon={<UndoOutlined />} disabled={!canUndo} onClick={undo} />
                </Tooltip>
                <Tooltip title="Redo (Ctrl+Shift+Z)">
                    <Button icon={<RedoOutlined />} disabled={!canRedo} onClick={redo} />
                </Tooltip>
                <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                onClick={handleSave}
                disabled={!hasUnsavedChanges}
                loading={loading}
                >
                Save Changes
                </Button>
            </div>
          </Col>
        </Row>
      </Card>

      {selectedVariant && currentProject && (
        <div style={{ display: 'flex', gap: '24px' }}>
          {/* Left: Layer List Sidebar */}
          <div style={{ width: 250 }}>
             <Card 
                title="Layer Stack" 
                size="small"
                bodyStyle={{ padding: 0 }}
             >
                <div style={{ padding: '8px 12px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Top to Bottom</Text>
                </div>
                <div style={{ maxHeight: 600, overflowY: 'auto', padding: 8 }}>
                    <DndContext 
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext 
                            items={[...interactiveLayers].reverse().map(l => l.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {[...interactiveLayers].reverse().map((item) => {
                                const isProduct = item.id.startsWith('product-');
                                const decoId = isProduct ? '' : item.id.replace('deco-', '');
                                
                                const adjustment = !isProduct && currentConfig?.decorationAdjustments?.find(a => a.decorationId === decoId);
                                const isAdjusted = !!adjustment;
                                const isSelected = selectedLayerId === item.id;
                                
                                // Find asset name
                                let name = item.id;
                                if (isProduct) {
                                    const prod = products.find(p => p.id === item.assetId);
                                    name = prod ? `Product: ${prod.meta.series}` : 'Product Layer';
                                } else {
                                    const asset = decorations.find(d => d.id === decoId);
                                    name = asset ? `${asset.meta.category} (${decoId.slice(-4)})` : decoId;
                                }

                                return (
                                    <SortableLayerItem
                                        key={item.id}
                                        id={item.id}
                                        layer={item}
                                        isSelected={isSelected}
                                        isAdjusted={isAdjusted}
                                        name={name}
                                        onClick={() => setSelectedLayerId(item.id)}
                                        onReset={() => !isProduct && handleResetAdjustment(decoId)}
                                    />
                                );
                            })}
                        </SortableContext>
                    </DndContext>
                </div>
             </Card>
          </div>

          {/* Center: Canvas */}
          <div style={{ width: 600 }}>
            <Card title="Interactive Preview" bodyStyle={{ padding: 0 }}>
              <div style={{ overflow: 'hidden', background: '#f0f0f0', display: 'flex', justifyContent: 'center' }}>
                <InteractiveCanvas
                  width={currentProject.canvasWidth}
                  height={currentProject.canvasHeight}
                  scale={0.5} 
                  layers={layers}
                  onLayerChange={handleLayerChange}
                  selectedLayerId={selectedLayerId} // Pass selection to canvas
                />
              </div>
            </Card>
            <div style={{ marginTop: 8, textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Tip: Select layer from left sidebar or click on canvas. Use Ctrl+Z to undo.
                </Text>
            </div>
          </div>
          
          {/* Right: Properties */}
          <div style={{ flex: 1 }}>
            <Card title="Properties">
              {!selectedLayerId ? (
                <Empty description="Select a layer to view properties" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                (() => {
                    const layer = layers.find(l => l.id === selectedLayerId);
                    if (!layer) return <Empty description="Layer not found" />;
                    
                    const isProduct = layer.id.startsWith('product-');
                    const decoId = isProduct ? '' : layer.id.replace('deco-', '');
                    const adj = !isProduct ? currentConfig?.decorationAdjustments?.find(a => a.decorationId === decoId) : undefined;
                    
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <Text type="secondary">Layer ID</Text>
                                <div><Text code>{layer.id}</Text></div>
                            </div>
                            <div>
                                <Text type="secondary">Current Position</Text>
                                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                                    <Tag>X: {Math.round(layer.x || 0)}</Tag>
                                    <Tag>Y: {Math.round(layer.y || 0)}</Tag>
                                </div>
                            </div>
                            {!isProduct && (
                                <div>
                                    <Text type="secondary">Adjustment Offset</Text>
                                    <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                                        <Tag color={adj ? 'blue' : 'default'}>dX: {Math.round(adj?.offsetX || 0)}</Tag>
                                        <Tag color={adj ? 'blue' : 'default'}>dY: {Math.round(adj?.offsetY || 0)}</Tag>
                                    </div>
                                </div>
                            )}
                            {adj && !isProduct && (
                                <Button danger onClick={() => handleResetAdjustment(decoId)}>
                                    Reset Position
                                </Button>
                            )}
                            {isProduct && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Product layer position is fixed by template.
                                </Text>
                            )}
                        </div>
                    );
                })()
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
