import { Router } from 'express';
import { assetController } from '../controllers/assetController';
import { upload } from '../utils/upload';

const router = Router();

// Products
router.get('/products', assetController.getProducts);
router.post('/products', upload.single('productImage'), assetController.uploadProduct);
router.delete('/products/:id', assetController.deleteProduct);

// Decorations
router.get('/decorations', assetController.getDecorations);
router.post('/decorations', upload.single('decorationImage'), assetController.uploadDecoration);
router.delete('/decorations/:id', assetController.deleteDecoration);

export default router;
