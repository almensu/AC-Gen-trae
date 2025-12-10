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
  const onLayerChangeRef = useRef(onLayerChange);

  useEffect(() => {
    onLayerChangeRef.current = onLayerChange;
  }, [onLayerChange]);

  // Initialize Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: width * scale,
      height: height * scale,
      backgroundColor: '#f0f0f0',
      perPixelTargetFind: true, // Enable pixel-level hit detection
      targetFindTolerance: 4,   // Allow small tolerance for easier selection
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
        onLayerChangeRef.current(layerId, {
          x: target.left || 0,
          y: target.top || 0,
        });
      }
    });

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [width, height, scale]);

  // Render Layers
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Use a flag to track if this effect is still active
    let isMounted = true;

    // Clear and redraw
    canvas.clear();
    canvas.setBackgroundColor('#f0f0f0', canvas.renderAll.bind(canvas));

    const loadImagesSequentially = async () => {
      for (const layer of layers) {
        if (!isMounted) break;

        if (layer.type === 'image' && layer.filePath) {
           await new Promise<void>((resolve) => {
             const imageUrl = `${API_BASE}${layer.filePath}`;
             fabric.Image.fromURL(imageUrl, (img) => {
               if (!isMounted) {
                 resolve();
                 return;
               }

               if (img) {
                 const isInteractive = layer.id.startsWith('deco-');
                 
                 img.set({
                   left: layer.x || 0,
                   top: layer.y || 0,
                   selectable: isInteractive,
                   evented: isInteractive,
                   name: layer.id,
                   hasControls: false,
                   hasBorders: true,
                   // @ts-ignore
                   zIndex: layer.zIndex
                 });
                 canvas.add(img);
               }
               resolve();
             }, { crossOrigin: 'anonymous' });
           });
        }
      }
      
      if (isMounted) {
        canvas.renderAll();
      }
    };

    loadImagesSequentially();

    return () => {
      isMounted = false;
    };

  }, [layers]); // Only re-run if layers change, assuming canvas ref persists

  return (
    <div style={{ border: '1px solid #1890ff', display: 'inline-block' }}>
      <canvas ref={canvasRef} />
    </div>
  );
};
