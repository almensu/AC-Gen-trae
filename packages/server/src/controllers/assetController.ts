import { Request, Response } from 'express';
import { assetService } from '../services/assetService';
import { ProductAsset, DecorationAsset, ProductAssetMeta, DecorationAssetMeta } from '@ac-gen/shared';
import path from 'path';

export const assetController = {
  // Products
  uploadProduct: async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Metadata is sent as JSON string in 'meta' field or individual fields
      // Let's assume 'meta' field contains JSON string
      const metaStr = req.body.meta;
      if (!metaStr) {
        return res.status(400).json({ error: 'Missing metadata' });
      }

      let meta: ProductAssetMeta;
      try {
        meta = JSON.parse(metaStr);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid metadata format' });
      }

      // Construct ProductAsset
      // filePath relative to storage root
      // storage/products/filename
      const relativePath = path.join('products', req.file.filename);

      const product: ProductAsset = {
        id: Date.now().toString(), // Simple ID generation
        filePath: relativePath,
        meta: meta
      };

      const savedProduct = await assetService.addProduct(product);
      res.status(201).json(savedProduct);

    } catch (error) {
      console.error('Upload product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getProducts: async (req: Request, res: Response) => {
    try {
      const products = await assetService.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  },

  deleteProduct: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await assetService.deleteProduct(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete product' });
    }
  },

  // Decorations
  uploadDecoration: async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const metaStr = req.body.meta;
      if (!metaStr) {
        return res.status(400).json({ error: 'Missing metadata' });
      }

      let meta: DecorationAssetMeta;
      try {
        meta = JSON.parse(metaStr);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid metadata format' });
      }

      // If we want to move file to project folder, we can do it here
      // But for now it's in storage/decorations (handled by multer config)
      const relativePath = path.join('decorations', req.file.filename);

      const decoration: DecorationAsset = {
        id: Date.now().toString(),
        filePath: relativePath,
        meta: meta
      };

      const savedDecoration = await assetService.addDecoration(decoration);
      res.status(201).json(savedDecoration);

    } catch (error) {
      console.error('Upload decoration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  getDecorations: async (req: Request, res: Response) => {
    try {
      const { projectId } = req.query;
      if (projectId && typeof projectId === 'string') {
        const decorations = await assetService.getDecorationsByProject(projectId);
        res.json(decorations);
      } else {
        const decorations = await assetService.getAllDecorations();
        res.json(decorations);
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch decorations' });
    }
  },

  deleteDecoration: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await assetService.deleteDecoration(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete decoration' });
    }
  }
};
