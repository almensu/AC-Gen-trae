import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = path.join(__dirname, '../../../../storage');
    
    // Determine subdirectory based on field name or body
    // Note: req.body might not be populated yet depending on field order
    // So we rely on a convention or just put everything in temp and move it?
    // Or we separate endpoints.
    
    // Simple strategy: Check route path or field name
    if (file.fieldname === 'productImage') {
      uploadPath = path.join(uploadPath, 'products');
    } else if (file.fieldname === 'decorationImage') {
      // For decorations, we might want to organize by project, but for now just flat or 'decorations' folder
      // We can organize by project subfolder if we have access to projectName in req.body
      // But req.body is tricky with multer.
      // Let's just put in 'decorations' root for MVP
      uploadPath = path.join(uploadPath, 'decorations');
    } else {
      uploadPath = path.join(uploadPath, 'misc');
    }

    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Keep original name but prepend timestamp to avoid collisions
    // Or use a UUID.
    // For products: Series_Color.png or similar.
    // Let's use timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({ storage: storage });
