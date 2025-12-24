# DKÜ OBS - Sistem Mimarisi (ARCHITECTURE.md)

## 1. Genel Bakış

DKÜ Öğrenci Bilgi Sistemi (OBS), Doğu Karadeniz Üniversitesi için geliştirilmiş kapsamlı bir üniversite yönetim sistemidir. Modern web teknolojileri kullanılarak mikroservis benzeri modüler bir yapıda tasarlanmıştır.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Web Browser   │  │  Mobile (PWA)   │  │   Admin Panel   │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │           │
│           └────────────────────┼────────────────────┘           │
│                                │                                 │
└────────────────────────────────┼─────────────────────────────────┘
                                 │ HTTPS
┌────────────────────────────────┼─────────────────────────────────┐
│                         API GATEWAY                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Express.js Server                       │   │
│  │  ├── Authentication Middleware (JWT)                       │   │
│  │  ├── Rate Limiting (express-rate-limit)                    │   │
│  │  ├── CORS Middleware                                       │   │
│  │  └── Request Logging (Morgan + Winston)                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────┼─────────────────────────────────┘
                                 │
┌────────────────────────────────┼─────────────────────────────────┐
│                       SERVICE LAYER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    Auth     │  │   Course    │  │  Enrollment │              │
│  │   Service   │  │   Service   │  │   Service   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Attendance │  │    Grade    │  │    Meal     │              │
│  │   Service   │  │   Service   │  │   Service   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Event     │  │ Notification│  │  Analytics  │              │
│  │   Service   │  │   Service   │  │   Service   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Wallet    │  │   Sensor    │  │   Email     │              │
│  │   Service   │  │   Service   │  │   Service   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└────────────────────────────────┼─────────────────────────────────┘
                                 │
┌────────────────────────────────┼─────────────────────────────────┐
│                        DATA LAYER                                 │
│  ┌──────────────────┐  ┌──────────────────┐                      │
│  │     PostgreSQL   │  │   File Storage   │                      │
│  │    (Sequelize)   │  │    (uploads/)    │                      │
│  └──────────────────┘  └──────────────────┘                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Teknoloji Stack'i

### 2.1 Backend
| Teknoloji | Versiyon | Kullanım Amacı |
|-----------|----------|----------------|
| Node.js | 20.x LTS | Runtime ortamı |
| Express.js | 4.x | Web framework |
| Sequelize | 6.x | ORM (Object-Relational Mapping) |
| PostgreSQL | 15.x | Ana veritabanı |
| Socket.io | 4.x | Real-time iletişim |
| JWT | - | Authentication token |
| Bcrypt | 5.x | Şifre hashleme |
| Nodemailer | 6.x | E-posta gönderimi |
| Node-cron | 3.x | Zamanlanmış görevler |
| Winston | 3.x | Logging |
| Morgan | 1.x | HTTP request logging |
| Multer | 1.x | Dosya yükleme |

### 2.2 Frontend
| Teknoloji | Versiyon | Kullanım Amacı |
|-----------|----------|----------------|
| React | 18.x | UI framework |
| Vite | 5.x | Build tool |
| React Router | 6.x | Client-side routing |
| Axios | 1.x | HTTP client |
| TailwindCSS | 3.x | CSS framework |
| Formik + Yup | - | Form yönetimi & validasyon |
| React Hot Toast | 2.x | Toast bildirimleri |
| React Icons | 5.x | İkon kütüphanesi |
| Recharts | 2.x | Grafik kütüphanesi |
| QRCode.react | 3.x | QR kod oluşturma |
| html5-qrcode | 2.x | QR kod okuma |

### 2.3 DevOps
| Teknoloji | Kullanım Amacı |
|-----------|----------------|
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |
| Google Cloud Build | CI/CD pipeline |
| Cloud Run | Serverless deployment |

---

## 3. Proje Yapısı

### 3.1 Backend Yapısı
```
backend/
├── src/
│   ├── app.js                 # Express app configuration
│   ├── server.js              # Server entry point
│   ├── config/
│   │   └── database.js        # Database configuration
│   ├── controllers/           # Request handlers (19 controllers)
│   ├── models/                # Sequelize models (30+ models)
│   ├── routes/                # API routes (20 route files)
│   ├── services/              # Business logic
│   ├── middleware/            # Express middleware
│   ├── jobs/                  # Background jobs (cron)
│   ├── seeders/               # Database seeders
│   └── utils/                 # Utility functions
├── tests/
│   ├── unit/                  # Unit tests
│   └── integration/           # Integration tests
├── uploads/                   # Uploaded files
├── logs/                      # Application logs
├── Dockerfile
├── docker-compose.yml
└── package.json
```

### 3.2 Frontend Yapısı
```
frontend/
├── src/
│   ├── App.jsx                # Main app component
│   ├── main.jsx               # Entry point
│   ├── index.css              # Global styles
│   ├── components/
│   │   ├── common/            # Reusable components
│   │   └── layout/            # Layout components
│   ├── pages/                 # Page components (17 folders)
│   ├── context/               # React Context
│   ├── services/              # API services
│   └── hooks/                 # Custom hooks
├── public/                    # Static assets
├── vite.config.js
└── package.json
```

---

## 4. Tasarım Kalıpları (Design Patterns)

### 4.1 Backend Kalıpları
| Kalıp | Açıklama | Örnek |
|-------|----------|-------|
| **MVC** | Model-View-Controller | Models, Controllers, Routes ayrımı |
| **Repository Pattern** | Veri erişim soyutlama | Sequelize models |
| **Service Layer** | İş mantığı ayrımı | `emailService`, `notificationService` |
| **Middleware Chain** | Request/response işleme | Auth, rate limiting, logging |
| **Singleton** | Tek örnek | Database connection, Socket.io |
| **Observer** | Event-driven | Socket.io notifications |

### 4.2 Frontend Kalıpları
| Kalıp | Açıklama | Örnek |
|-------|----------|-------|
| **Component Composition** | Bileşen birleştirme | Reusable UI components |
| **Context API** | Global state | AuthContext |
| **Custom Hooks** | Reusable logic | `useAuth` |
| **Higher-Order Components** | Component wrapping | Protected routes |

---

## 5. Veri Akışı (Data Flow)

### 5.1 Authentication Flow
```
1. User → Login Request → AuthController
2. AuthController → Validate Credentials → User Model
3. User Model → Return User Data → AuthController
4. AuthController → Generate JWT → Return Token
5. Client → Store Token → LocalStorage
6. Client → Include Token → All Subsequent Requests
```

### 5.2 Notification Flow
```
1. Event Occurs (Grade Update, Attendance, etc.)
2. Controller → Call NotificationService
3. NotificationService → Create DB Record
4. NotificationService → Emit Socket Event
5. Client → Receive Real-time Update
```

---

## 6. Güvenlik Mimarisi

| Özellik | Uygulama |
|---------|----------|
| Authentication | JWT (24 saat geçerlilik) |
| Password Hashing | Bcrypt (10 salt rounds) |
| Authorization | Role-based (student, faculty, admin) |
| Rate Limiting | 100 requests / 15 dakika |
| Input Validation | Yup, Express-validator |
| SQL Injection | Sequelize parameterized queries |

---

## 7. Deployment Mimarisi

```
┌─────────────────────┐
│   Cloud Run         │ ← Auto-scaling
│   (Container)       │
└──────────┬──────────┘
           │
┌──────────┴──────────┐
│     Cloud SQL       │ ← Managed PostgreSQL
│    (PostgreSQL)     │
└─────────────────────┘
```

---

*Son Güncelleme: 24 Aralık 2024*
