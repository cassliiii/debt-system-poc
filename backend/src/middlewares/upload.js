const multer = require('multer');

// Configurar multer para almacenar el archivo temporalmente en memoria (Buffer)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB por archivo
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Formato inválido. Solo se permiten archivos con extensión .csv'), false);
    }
  }
});

module.exports = upload;