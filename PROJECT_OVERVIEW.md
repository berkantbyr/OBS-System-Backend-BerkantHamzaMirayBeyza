# 📋 Proje Genel Bakış - Üniversite OBS

## 1. Proje Tanımı

**Üniversite Öğrenci Bilgi Sistemi (OBS)**, üniversitelerin öğrenci, öğretim üyesi ve yönetici ihtiyaçlarını karşılamak için tasarlanmış kapsamlı bir web uygulamasıdır. Sistem, kimlik doğrulama, kullanıcı yönetimi, ders kayıtları, yoklama takibi, not girişi ve daha birçok modülü içermektedir.

### Amaç
- Öğrenci bilgilerinin merkezi yönetimi
- Ders ve sınav süreçlerinin dijitalleştirilmesi
- Öğretim üyeleri için yoklama ve not yönetimi
- Yöneticiler için kapsamlı raporlama

### Kapsam (Part 1)
Part 1 kapsamında aşağıdaki temel özellikler tamamlanmıştır:
- Kullanıcı kimlik doğrulama sistemi
- Kullanıcı kayıt ve profil yönetimi
- Rol tabanlı yetkilendirme
- Temel frontend arayüzü

## 2. Teknoloji Stack

### 2.1 Frontend

| Teknoloji | Versiyon | Açıklama |
|-----------|----------|----------|
| React | 18.2.0 | UI kütüphanesi |
| Vite | 5.0.8 | Build tool |
| React Router | 6.21.0 | Client-side routing |
| Axios | 1.6.2 | HTTP client |
| Formik | 2.4.5 | Form yönetimi |
| Yup | 1.3.2 | Şema validasyonu |
| Tailwind CSS | 3.3.6 | CSS framework |
| React Hot Toast | 2.4.1 | Bildirimler |
| React Icons | 4.12.0 | İkon kütüphanesi |

### 2.2 Backend

| Teknoloji | Versiyon | Açıklama |
|-----------|----------|----------|
| Node.js | 18+ LTS | Runtime |
| Express.js | 4.18.2 | Web framework |
| MySQL | 8.0+ | Veritabanı |
| Sequelize | 6.35.2 | ORM |
| JWT | 9.0.2 | Authentication |
| bcrypt | 5.1.1 | Şifre hashleme |
| Joi | 17.11.0 | Validasyon |
| Multer | 1.4.5 | Dosya yükleme |
| NodeMailer | 6.9.7 | E-posta |
| Winston | 3.11.0 | Logging |

### 2.3 DevOps

| Teknoloji | Açıklama |
|-----------|----------|
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |
| Git | Version control |
| Jest | Testing framework |

## 3. Proje Yapısı

```
University-obs-system/
│
├── 📁 backend/                    # Backend API
│   ├── 📁 src/
│   │   ├── 📁 config/            # Yapılandırma
│   │   │   ├── database.js       # DB config
│   │   │   ├── jwt.js            # JWT config
│   │   │   └── email.js          # Email config
│   │   │
│   │   ├── 📁 controllers/       # Request handlers
│   │   │   ├── authController.js
│   │   │   └── userController.js
│   │   │
│   │   ├── 📁 middleware/        # Express middleware
│   │   │   ├── auth.js           # Auth & authorization
│   │   │   ├── errorHandler.js   # Global error handler
│   │   │   ├── validate.js       # Request validation
│   │   │   └── upload.js         # File upload
│   │   │
│   │   ├── 📁 models/            # Sequelize models
│   │   │   ├── index.js          # Model loader
│   │   │   ├── User.js
│   │   │   ├── Student.js
│   │   │   ├── Faculty.js
│   │   │   ├── Department.js
│   │   │   ├── RefreshToken.js
│   │   │   ├── PasswordReset.js
│   │   │   └── EmailVerification.js
│   │   │
│   │   ├── 📁 routes/            # API routes
│   │   │   ├── index.js
│   │   │   ├── authRoutes.js
│   │   │   └── userRoutes.js
│   │   │
│   │   ├── 📁 services/          # Business logic
│   │   │   ├── authService.js
│   │   │   ├── userService.js
│   │   │   └── emailService.js
│   │   │
│   │   ├── 📁 utils/             # Utilities
│   │   │   ├── jwt.js
│   │   │   ├── password.js
│   │   │   ├── validators.js
│   │   │   └── logger.js
│   │   │
│   │   └── app.js                # Ana uygulama
│   │
│   ├── 📁 tests/                 # Test dosyaları
│   │   ├── 📁 unit/
│   │   └── 📁 integration/
│   │
│   ├── 📁 uploads/               # Yüklenen dosyalar
│   ├── 📁 logs/                  # Log dosyaları
│   ├── package.json
│   ├── Dockerfile
│   └── env.example
│
├── 📁 frontend/                   # React frontend
│   ├── 📁 src/
│   │   ├── 📁 components/        # UI bileşenleri
│   │   │   ├── 📁 common/        # Ortak bileşenler
│   │   │   ├── 📁 layout/        # Layout bileşenleri
│   │   │   └── 📁 auth/          # Auth bileşenleri
│   │   │
│   │   ├── 📁 context/           # React Context
│   │   │   └── AuthContext.jsx
│   │   │
│   │   ├── 📁 pages/             # Sayfa bileşenleri
│   │   │   ├── 📁 auth/          # Auth sayfaları
│   │   │   ├── 📁 dashboard/     # Dashboard
│   │   │   └── 📁 profile/       # Profil
│   │   │
│   │   ├── 📁 services/          # API servisleri
│   │   │   ├── api.js
│   │   │   ├── authService.js
│   │   │   └── userService.js
│   │   │
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   │
│   ├── 📁 public/
│   ├── package.json
│   ├── Dockerfile
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── docker-compose.yml
├── .gitignore
├── README.md
├── PROJECT_OVERVIEW.md
├── API_DOCUMENTATION.md
├── DATABASE_SCHEMA.md
├── USER_MANUAL_PART1.md
└── TEST_REPORT_PART1.md
```

## 4. Grup Üyeleri ve Görev Dağılımı

| Ad Soyad | Görev | Sorumluluk Alanı |
|----------|-------|------------------|
| [İsim 1] | Proje Lideri | Proje yönetimi, Backend mimarisi |
| [İsim 2] | Backend Developer | API geliştirme, Veritabanı |
| [İsim 3] | Frontend Developer | React UI, State management |
| [İsim 4] | DevOps | Docker, CI/CD, Deployment |

## 5. Geliştirme Süreci

### 5.1 Part 1 Timeline

| Hafta | Görev | Durum |
|-------|-------|-------|
| 1 | Proje yapısı ve veritabanı tasarımı | ✅ Tamamlandı |
| 2 | Authentication endpoints | ✅ Tamamlandı |
| 3 | User management ve frontend | ✅ Tamamlandı |
| 4 | Test, dokümantasyon ve deployment | ✅ Tamamlandı |

### 5.2 İletişim Kanalları

- **GitHub:** Repository yönetimi
- **Discord/Slack:** Anlık iletişim
- **Trello/Jira:** Görev takibi

## 6. Sonraki Adımlar (Part 2+)

- [ ] Ders yönetimi modülü
- [ ] Yoklama sistemi
- [ ] Not girişi ve hesaplama
- [ ] Etkinlik yönetimi
- [ ] Yemekhane ve cüzdan sistemi
- [ ] IoT sensör entegrasyonu
- [ ] Mobil uygulama

---

📅 Son Güncelleme: Aralık 2024

