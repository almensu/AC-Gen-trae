import { JsonDb } from '../utils/jsonDb';
import { ProductAsset, DecorationAsset } from '@ac-gen/shared';
import path from 'path';
import fs from 'fs/promises';

const productsDb = new JsonDb<ProductAsset>('products.json');
const decorationsDb = new JsonDb<DecorationAsset>('decorations.json');

export const assetService = {
  // Products
  async getAllProducts(): Promise<ProductAsset[]> {
    return productsDb.read();
  },

  async addProduct(product: ProductAsset): Promise<ProductAsset> {
    await productsDb.add(product);
    return product;
  },

  async deleteProduct(id: string): Promise<void> {
    const products = await productsDb.read();
    const product = products.find(p => p.id === id);
    if (product) {
      // Delete file
      const filePath = path.join(__dirname, '../../../../storage', product.filePath);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error('Failed to delete file:', filePath, err);
      }
      // Delete from DB
      await productsDb.delete(p => p.id === id);
    }
  },

  // Decorations
  async getAllDecorations(): Promise<DecorationAsset[]> {
    return decorationsDb.read();
  },

  async addDecoration(decoration: DecorationAsset): Promise<DecorationAsset> {
    await decorationsDb.add(decoration);
    return decoration;
  },

  async deleteDecoration(id: string): Promise<void> {
    const decorations = await decorationsDb.read();
    const decoration = decorations.find(d => d.id === id);
    if (decoration) {
      // Delete file
      const filePath = path.join(__dirname, '../../../../storage', decoration.filePath);
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error('Failed to delete file:', filePath, err);
      }
      // Delete from DB
      await decorationsDb.delete(d => d.id === id);
    }
  },
  
  async getDecorationsByProject(projectName: string): Promise<DecorationAsset[]> {
    const all = await decorationsDb.read();
    return all.filter(d => d.meta.projectName === projectName);
  },

  async duplicateDecorations(sourceProjectName: string, targetProjectName: string): Promise<void> {
    const all = await decorationsDb.read();
    const sourceDecorations = all.filter(d => d.meta.projectName === sourceProjectName);
    
    const newDecorations: DecorationAsset[] = sourceDecorations.map(d => ({
      ...d,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      meta: {
        ...d.meta,
        projectName: targetProjectName
      }
    }));
    
    for (const d of newDecorations) {
      await decorationsDb.add(d);
    }
  }
};
