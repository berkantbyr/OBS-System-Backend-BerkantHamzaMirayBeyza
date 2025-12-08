const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_PATH || 'uploads/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Sadece JPG ve PNG formatları desteklenmektedir'), false);
  }
};

// Configure multer
const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
  },
});

// Single file upload middleware for profile pictures
const uploadProfilePicture = upload.single('profilePicture');

// Handle multer errors
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Dosya boyutu çok büyük. Maksimum 5MB yükleyebilirsiniz.',
        code: 'FILE_TOO_LARGE',
      });
    }
    return res.status(400).json({
      success: false,
      message: 'Dosya yükleme hatası',
      code: 'UPLOAD_ERROR',
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
      code: 'UPLOAD_ERROR',
    });
  }
  
  next();
};

module.exports = {
  upload,
  uploadProfilePicture,
  handleUploadError,
};

