const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de almacenamiento temporal
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/profiles';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Usamos un nombre temporal, luego el controller lo renombrará a nombreUsuario
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtro de archivos por extensión
const fileFilter = (req, file, cb) => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Formato de archivo no permitido. Solo se aceptan: ' + allowedExtensions.join(', ')), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB máximo
    }
});

module.exports = upload;
