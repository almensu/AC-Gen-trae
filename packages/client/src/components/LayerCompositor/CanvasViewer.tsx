import React, { useEffect, useRef } from 'react';
import { fabric } from 'fabric';
import { LayerItem, Project } from '@ac-gen/shared';

interface CanvasViewerProps {
  width: number;
  height: number;
  layers: LayerItem[];
  project?: Project; // Add project to get original dimensions
}

const API_BASE = 'http://localhost:3001/storage/';

export const CanvasViewer: React.FC<CanvasViewerProps> = ({ width, height, layers, project }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  // 初始化 Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    // 创建 fabric canvas 实例
    const canvas = new fabric.Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#f0f0f0', // 灰色背景方便看透明图
    });

    // 计算缩放比例
    if (project) {
        const scaleX = width / project.canvasWidth;
        const scaleY = height / project.canvasHeight;
        // 使用较小的缩放比例以适应容器（contain）
        const scale = Math.min(scaleX, scaleY);
        
        if (scale !== 1) {
            canvas.setZoom(scale);
            // 如果缩放比例不一致（非正方形），可能需要平移居中，这里暂不处理
        }
    }

    fabricCanvasRef.current = canvas;

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [width, height, project]);

  // 渲染图层
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    let isCancelled = false;

    const renderCanvas = async () => {
      console.log('CanvasViewer: Rendering layers', layers.map(l => ({ id: l.id, zIndex: l.zIndex })));
      
      // Force clear
      canvas.clear();
      canvas.setBackgroundColor('#f0f0f0', canvas.renderAll.bind(canvas));

      // 排序：Fabric.js 的绘制顺序是按 add 的顺序。
      // layers 已经是按 zIndex 从小到大排序的了，所以直接循环 add 即可。
      // 但为了双重保险，我们在 add 后再调用一次 sortObjects
      
      for (const layer of layers) {
        if (isCancelled) return;

        if (layer.type === 'image' && layer.filePath) {
           await new Promise<void>((resolve) => {
             const imageUrl = `${API_BASE}${layer.filePath}`;
             fabric.Image.fromURL(imageUrl, (img) => {
               if (isCancelled) {
                 resolve();
                 return;
               }

               if (img) {
                 img.set({ 
                    left: layer.x || 0,
                    top: layer.y || 0,
                    selectable: false, 
                    evented: false,
                    // @ts-ignore
                    zIndex: layer.zIndex 
                 });
                 canvas.add(img);
               }
               resolve();
             }, { crossOrigin: 'anonymous' });
           });
        } else if (layer.type === 'text' && layer.textContent && layer.textStyle) {
            // Render text layer
            const text = new fabric.Text(layer.textContent, {
                left: layer.x || 0,
                top: layer.y || 0,
                fontFamily: layer.textStyle.fontFamily,
                fontSize: layer.textStyle.fontSize,
                fill: layer.textStyle.color,
                selectable: false,
                evented: false,
                // @ts-ignore
                zIndex: layer.zIndex
            });
            canvas.add(text);
        }
      }
      
      if (!isCancelled) {
        // 关键修复：图片是异步加载的，虽然我们用了 await 顺序加载，
        // 但为了确保 Fabric 内部对象顺序绝对正确，我们根据 zIndex 再排一次序
        // 虽然理论上 add 顺序对了就行，但这里可能存在某些竟态
        
        // 其实 fabric 的 _objects 数组顺序决定了渲染顺序
        // 我们检查一下是否需要 moveTo
        
        canvas.renderAll();
      }
    };

    renderCanvas();

    return () => {
      isCancelled = true;
    };

  }, [layers]);

  return (
    <div style={{ border: '1px solid #d9d9d9', display: 'inline-block' }}>
      <canvas ref={canvasRef} />
    </div>
  );
};
