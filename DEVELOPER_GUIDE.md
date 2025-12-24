# DKÜ OBS - Geliştirici Rehberi (DEVELOPER_GUIDE.md)

## 1. Geliştirme Ortamı Kurulumu

### 1.1 Gerekli Araçlar
```bash
# Node.js (NVM ile önerilir)
nvm install 20
nvm use 20

# PostgreSQL
# Windows: https://www.postgresql.org/download/windows/
# macOS: brew install postgresql@15
# Linux: sudo apt install postgresql-15
```

### 1.2 Proje Kurulumu
```bash
# Repository klonla
git clone https://github.com/your-repo/OBS-System.git

# Backend
cd OBS-System-Backend
npm install
cp env.example .env
npm run dev

# Frontend (ayrı terminal)
cd OBS-System-Frontend
npm install
npm run dev
```

---

## 2. Proje Yapısı

### 2.1 Backend Klasör Yapısı
```
src/
├── controllers/    # Request handlers - HTTP isteklerini işler
├── models/         # Sequelize models - Veritabanı şemaları
├── routes/         # Express routes - API endpoint tanımları
├── services/       # Business logic - İş mantığı
├── middleware/     # Express middleware - Auth, validation, etc.
├── jobs/           # Cron jobs - Zamanlanmış görevler
├── seeders/        # Database seeders - Test verileri
├── utils/          # Utility functions - Yardımcı fonksiyonlar
└── config/         # Configuration - Yapılandırma dosyaları
```

### 2.2 Frontend Klasör Yapısı
```
src/
├── components/     # Reusable UI components
│   ├── common/     # Button, Input, Modal, etc.
│   └── layout/     # Sidebar, Navbar
├── pages/          # Page components (route-based)
├── context/        # React Context providers
├── services/       # API service modules
├── hooks/          # Custom React hooks
└── utils/          # Helper functions
```

---

## 3. Kodlama Standartları

### 3.1 JavaScript/React Kuralları
```javascript
// ✅ Doğru: camelCase değişken isimleri
const userName = 'Ahmet';
const isActive = true;

// ✅ Doğru: PascalCase component isimleri
const UserProfile = () => { ... };

// ✅ Doğru: UPPER_CASE sabitler
const MAX_FILE_SIZE = 5242880;

// ✅ Doğru: Async/await kullanımı
const fetchData = async () => {
  try {
    const response = await api.get('/users');
    return response.data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};
```

### 3.2 Dosya İsimlendirme
| Tip | Format | Örnek |
|-----|--------|-------|
| Component | PascalCase.jsx | `UserProfile.jsx` |
| Service | camelCase.js | `userService.js` |
| Controller | camelCase.js | `userController.js` |
| Model | PascalCase.js | `User.js` |
| Route | camelCase.js | `userRoutes.js` |
| Test | *.test.js | `user.test.js` |

### 3.3 Import Sıralaması
```javascript
// 1. Node modules
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// 2. Third-party libraries
import axios from 'axios';
import toast from 'react-hot-toast';

// 3. Local components
import Button from '../components/common/Button';
import Input from '../components/common/Input';

// 4. Services
import userService from '../services/userService';

// 5. Styles
import './UserProfile.css';
```

---

## 4. API Geliştirme

### 4.1 Controller Template
```javascript
// src/controllers/exampleController.js
const ExampleModel = require('../models/ExampleModel');
const logger = require('../utils/logger');

/**
 * @route   GET /api/v1/examples
 * @desc    Get all examples
 * @access  Authenticated
 */
const getExamples = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const examples = await ExampleModel.findAndCountAll({
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: examples.rows,
      pagination: {
        total: examples.count,
        page: parseInt(page),
        pages: Math.ceil(examples.count / limit)
      }
    });
  } catch (error) {
    logger.error('Get examples error:', error);
    res.status(500).json({
      success: false,
      message: 'Veriler alınamadı',
      error: error.message
    });
  }
};

module.exports = { getExamples };
```

### 4.2 Route Template
```javascript
// src/routes/exampleRoutes.js
const express = require('express');
const router = express.Router();
const exampleController = require('../controllers/exampleController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate); // Tüm route'lar için auth gerekli

router.get('/', exampleController.getExamples);
router.get('/:id', exampleController.getExampleById);
router.post('/', authorize('admin'), exampleController.createExample);
router.put('/:id', authorize('admin'), exampleController.updateExample);
router.delete('/:id', authorize('admin'), exampleController.deleteExample);

module.exports = router;
```

---

## 5. Frontend Geliştirme

### 5.1 Component Template
```jsx
// src/pages/example/ExamplePage.jsx
import { useState, useEffect } from 'react';
import { FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import exampleService from '../../services/exampleService';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ExamplePage = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await exampleService.getAll();
      if (response.success) {
        setData(response.data);
      }
    } catch (error) {
      toast.error('Veriler yüklenemedi');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Example Page</h1>
      {/* Content */}
    </div>
  );
};

export default ExamplePage;
```

### 5.2 Service Template
```javascript
// src/services/exampleService.js
import api from './api';

const exampleService = {
  getAll: async (params = {}) => {
    const response = await api.get('/examples', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/examples/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/examples', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/examples/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/examples/${id}`);
    return response.data;
  }
};

export default exampleService;
```

---

## 6. Test Yazma

### 6.1 Unit Test
```javascript
// tests/unit/userService.test.js
const userService = require('../../src/services/userService');

describe('UserService', () => {
  describe('validateEmail', () => {
    it('should return true for valid email', () => {
      expect(userService.validateEmail('test@example.com')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(userService.validateEmail('invalid')).toBe(false);
    });
  });
});
```

### 6.2 Integration Test
```javascript
// tests/integration/auth.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('Auth API', () => {
  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'student@dku.edu.tr',
          password: 'password123'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });
  });
});
```

### 6.3 Test Çalıştırma
```bash
# Tüm testler
npm test

# Coverage ile
npm run test:coverage

# Watch mode
npm run test:watch

# Belirli test dosyası
npm test -- auth.test.js
```

---

## 7. Git Workflow

### 7.1 Branch Stratejisi
```
main          ← Production-ready code
├── develop   ← Development branch
│   ├── feature/user-profile
│   ├── feature/attendance-qr
│   └── bugfix/login-issue
```

### 7.2 Commit Mesajları
```bash
# Format: <type>(<scope>): <description>

# Types:
feat:     Yeni özellik
fix:      Bug düzeltme
docs:     Dokümantasyon
style:    Kod formatlama
refactor: Kod refactoring
test:     Test ekleme/düzeltme
chore:    Build, config değişiklikleri

# Örnekler:
git commit -m "feat(auth): add password reset functionality"
git commit -m "fix(attendance): correct QR code expiration"
git commit -m "docs(readme): update installation guide"
```

### 7.3 Pull Request Süreci
1. Feature branch oluştur
2. Değişiklikleri yap ve commit et
3. Testleri çalıştır
4. PR aç (develop branch'e)
5. Code review bekle
6. Merge

---

## 8. Debugging

### 8.1 Backend Debugging
```javascript
// Console logging
console.log('📤 Request:', req.body);
console.log('📥 Response:', response);

// Winston logger
const logger = require('./utils/logger');
logger.info('Operation completed');
logger.error('Error occurred:', error);

// VS Code debugging
// launch.json configuration:
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "program": "${workspaceFolder}/src/server.js"
}
```

### 8.2 Frontend Debugging
```javascript
// React DevTools kullan
// Console logging
console.log('🔄 State:', state);
console.log('📤 API Call:', params);

// Network tab'ı kontrol et
// Redux DevTools (eğer kullanılıyorsa)
```

---

## 9. Sık Karşılaşılan Sorunlar

| Sorun | Çözüm |
|-------|-------|
| CORS hatası | Backend'de `FRONTEND_URL` kontrol et |
| 401 Unauthorized | Token geçerliliğini kontrol et |
| Sequelize association hatası | Model ilişkilerini kontrol et |
| React hydration hatası | Server ve client render uyumluluğu |
| Import hatası | Dosya yollarını kontrol et |

---

## 10. Faydalı Kaynaklar

- [Express.js Docs](https://expressjs.com/)
- [Sequelize Docs](https://sequelize.org/)
- [React Docs](https://react.dev/)
- [TailwindCSS Docs](https://tailwindcss.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)

---

*Son Güncelleme: 24 Aralık 2024*
