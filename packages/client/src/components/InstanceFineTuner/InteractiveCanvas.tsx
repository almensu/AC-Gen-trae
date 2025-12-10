import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { LayerItem } from '@ac-gen/shared';

interface InteractiveCanvasProps {
  width: number;
  height: number;
  scale?: number;
  layers: LayerItem[];
  onLayerChange: (layerId: string, changes: { x: number; y: number }) => void;
}

const API_BASE = 'http://localhost:3001/storage/';

export const InteractiveCanvas: React.FC<InteractiveCanvasProps> = ({ width, height, scale = 1, layers, onLayerChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  // Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: width * scale,
      height: height * scale,
      backgroundColor: '#f0f0f0',
    });
    
    // Set global zoom for rendering, but internal coordinates remain consistent
    canvas.setZoom(scale);

    fabricCanvasRef.current = canvas;

    // Event listener for movement
    canvas.on('object:modified', (e) => {
      const target = e.target;
      if (!target) return;

      // @ts-ignore - name is added when creating object
      const layerId = target.name;
      if (layerId) {
        onLayerChange(layerId, {
          x: target.left || 0,
          y: target.top || 0,
        });
      }
    });

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [width, height, scale, onLayerChange]);

  // Render Layers
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Clear and redraw
    // Note: In interactive mode, full redraw might be jarring if we just moved something.
    // But since `layers` prop updates come from parent after we update state, 
    // it effectively syncs.
    // Optimization: Diff layers? For MVP, redraw is fine.
    
    canvas.clear();
    canvas.setBackgroundColor('#f0f0f0', canvas.renderAll.bind(canvas));

    const loadImagesSequentially = async () => {
      // Create a map of layers for zIndex lookup
      const layerMap = new Map(layers.map(l => [l.id, l]));

      for (const layer of layers) {
        if (layer.type === 'image' && layer.filePath) {
           await new Promise<void>((resolve) => {
             const imageUrl = `${API_BASE}${layer.filePath}`;
             fabric.Image.fromURL(imageUrl, (img) => {
               if (img) {
                 const isInteractive = layer.id.startsWith('deco-'); // Check ID prefix
                 
                 img.set({
                   left: layer.x || 0,
                   top: layer.y || 0,
                   selectable: isInteractive,
                   evented: isInteractive,
                   name: layer.id, // Store layer ID
                   hasControls: false, // Disable rotation/scale handles for now
                   hasBorders: true,
                   // @ts-ignore
                   zIndex: layer.zIndex // Store zIndex for potential sorting
                 });
                 canvas.add(img);
               }
               resolve();
             }, { crossOrigin: 'anonymous' });
           });
        }
      }
      canvas.renderAll();
    };

    loadImagesSequentially();

  }, [layers]);

  return (
    <div style={{ border: '1px solid #1890ff', display: 'inline-block' }}>
      <canvas ref={canvasRef} />
    </div>
  );
};
