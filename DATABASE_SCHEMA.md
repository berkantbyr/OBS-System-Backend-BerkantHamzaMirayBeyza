# 📊 Veritabanı Şeması - Part 1

## ER Diagram

```
┌──────────────────┐       ┌──────────────────┐
│     users        │       │   departments    │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │
│ email (UNIQUE)   │       │ name             │
│ password_hash    │       │ code (UNIQUE)    │
│ role             │       │ faculty          │
│ first_name       │       │ description      │
│ last_name        │       │ head_of_dept     │
│ phone            │       │ established_date │
│ profile_pic_url  │       │ is_active        │
│ is_active        │       │ created_at       │
│ is_verified      │       │ updated_at       │
│ last_login       │       └────────┬─────────┘
│ created_at       │                │
│ updated_at       │                │
└────────┬─────────┘                │
         │                          │
         │ 1:1                      │ 1:N
         ▼                          │
┌──────────────────┐                │
│    students      │◄───────────────┘
├──────────────────┤
│ id (PK)          │
│ user_id (FK)     │
│ student_number   │
│ department_id    │
│ enrollment_date  │
│ graduation_date  │
│ gpa              │
│ cgpa             │
│ total_credits    │
│ current_semester │
│ status           │
│ created_at       │
│ updated_at       │
└──────────────────┘

┌──────────────────┐
│    faculty       │◄───────────────┐
├──────────────────┤                │
│ id (PK)          │                │
│ user_id (FK)     │                │ 1:N
│ employee_number  │                │
│ department_id    │────────────────┘
│ title            │
│ office_location  │
│ office_hours     │
│ specialization   │
│ hire_date        │
│ status           │
│ created_at       │
│ updated_at       │
└──────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  refresh_tokens  │       │ password_resets  │       │email_verifications│
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ user_id (FK)     │       │ user_id (FK)     │       │ user_id (FK)     │
│ token (UNIQUE)   │       │ token (UNIQUE)   │       │ token (UNIQUE)   │
│ expires_at       │       │ expires_at       │       │ expires_at       │
│ is_revoked       │       │ is_used          │       │ is_used          │
│ ip_address       │       │ created_at       │       │ created_at       │
│ user_agent       │       │ updated_at       │       │ updated_at       │
│ created_at       │       └──────────────────┘       └──────────────────┘
│ updated_at       │
└──────────────────┘
```

## Tablo Açıklamaları

### 1. users

Tüm kullanıcıların temel bilgilerini içerir.

| Kolon | Tip | Constraint | Açıklama |
|-------|-----|------------|----------|
| id | UUID | PK, DEFAULT uuid_generate_v4() | Benzersiz tanımlayıcı |
| email | VARCHAR(255) | NOT NULL, UNIQUE | E-posta adresi |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hash |
| role | ENUM | NOT NULL, DEFAULT 'student' | student, faculty, admin |
| first_name | VARCHAR(100) | NOT NULL | Ad |
| last_name | VARCHAR(100) | NOT NULL | Soyad |
| phone | VARCHAR(20) | NULL | Telefon |
| profile_picture_url | VARCHAR(500) | NULL | Profil fotoğrafı URL |
| is_active | BOOLEAN | DEFAULT FALSE | Hesap aktif mi |
| is_verified | BOOLEAN | DEFAULT FALSE | E-posta doğrulandı mı |
| last_login | TIMESTAMP | NULL | Son giriş tarihi |
| created_at | TIMESTAMP | NOT NULL | Oluşturulma tarihi |
| updated_at | TIMESTAMP | NOT NULL | Güncellenme tarihi |

**Indexler:**
- `idx_users_email` (UNIQUE)
- `idx_users_role`
- `idx_users_is_active`

---

### 2. students

Öğrenci detay bilgilerini içerir.

| Kolon | Tip | Constraint | Açıklama |
|-------|-----|------------|----------|
| id | UUID | PK | Benzersiz tanımlayıcı |
| user_id | UUID | FK → users.id, UNIQUE | Kullanıcı referansı |
| student_number | VARCHAR(20) | NOT NULL, UNIQUE | Öğrenci numarası |
| department_id | UUID | FK → departments.id | Bölüm referansı |
| enrollment_date | DATE | DEFAULT NOW | Kayıt tarihi |
| graduation_date | DATE | NULL | Mezuniyet tarihi |
| gpa | DECIMAL(3,2) | DEFAULT 0.00 | Dönem ortalaması |
| cgpa | DECIMAL(3,2) | DEFAULT 0.00 | Genel ortalama |
| total_credits | INTEGER | DEFAULT 0 | Toplam kredi |
| current_semester | INTEGER | DEFAULT 1 | Mevcut dönem |
| status | ENUM | DEFAULT 'active' | active, graduated, suspended, withdrawn |
| created_at | TIMESTAMP | NOT NULL | Oluşturulma tarihi |
| updated_at | TIMESTAMP | NOT NULL | Güncellenme tarihi |

**Indexler:**
- `idx_students_student_number` (UNIQUE)
- `idx_students_user_id` (UNIQUE)
- `idx_students_department_id`
- `idx_students_status`

---

### 3. faculty

Öğretim üyesi detay bilgilerini içerir.

| Kolon | Tip | Constraint | Açıklama |
|-------|-----|------------|----------|
| id | UUID | PK | Benzersiz tanımlayıcı |
| user_id | UUID | FK → users.id, UNIQUE | Kullanıcı referansı |
| employee_number | VARCHAR(20) | NOT NULL, UNIQUE | Personel numarası |
| department_id | UUID | FK → departments.id | Bölüm referansı |
| title | ENUM | NOT NULL, DEFAULT 'lecturer' | Akademik unvan |
| office_location | VARCHAR(100) | NULL | Ofis konumu |
| office_hours | TEXT | NULL | Ofis saatleri |
| specialization | VARCHAR(255) | NULL | Uzmanlık alanı |
| hire_date | DATE | NULL | İşe başlama tarihi |
| status | ENUM | DEFAULT 'active' | active, on_leave, retired, terminated |
| created_at | TIMESTAMP | NOT NULL | Oluşturulma tarihi |
| updated_at | TIMESTAMP | NOT NULL | Güncellenme tarihi |

**Title ENUM değerleri:**
- professor
- associate_professor
- assistant_professor
- lecturer
- research_assistant

---

### 4. departments

Bölüm bilgilerini içerir.

| Kolon | Tip | Constraint | Açıklama |
|-------|-----|------------|----------|
| id | UUID | PK | Benzersiz tanımlayıcı |
| name | VARCHAR(200) | NOT NULL | Bölüm adı |
| code | VARCHAR(10) | NOT NULL, UNIQUE | Bölüm kodu |
| faculty | VARCHAR(200) | NOT NULL | Fakülte adı |
| description | TEXT | NULL | Açıklama |
| head_of_department | UUID | NULL | Bölüm başkanı |
| established_date | DATE | NULL | Kuruluş tarihi |
| is_active | BOOLEAN | DEFAULT TRUE | Aktif mi |
| created_at | TIMESTAMP | NOT NULL | Oluşturulma tarihi |
| updated_at | TIMESTAMP | NOT NULL | Güncellenme tarihi |

---

### 5. refresh_tokens

JWT refresh token'larını saklar.

| Kolon | Tip | Constraint | Açıklama |
|-------|-----|------------|----------|
| id | UUID | PK | Benzersiz tanımlayıcı |
| user_id | UUID | FK → users.id | Kullanıcı referansı |
| token | VARCHAR(500) | NOT NULL, UNIQUE | Refresh token |
| expires_at | TIMESTAMP | NOT NULL | Son geçerlilik tarihi |
| is_revoked | BOOLEAN | DEFAULT FALSE | İptal edildi mi |
| ip_address | VARCHAR(45) | NULL | IP adresi |
| user_agent | VARCHAR(500) | NULL | Tarayıcı bilgisi |
| created_at | TIMESTAMP | NOT NULL | Oluşturulma tarihi |
| updated_at | TIMESTAMP | NOT NULL | Güncellenme tarihi |

---

### 6. password_resets

Şifre sıfırlama token'larını saklar.

| Kolon | Tip | Constraint | Açıklama |
|-------|-----|------------|----------|
| id | UUID | PK | Benzersiz tanımlayıcı |
| user_id | UUID | FK → users.id | Kullanıcı referansı |
| token | VARCHAR(500) | NOT NULL, UNIQUE | Reset token |
| expires_at | TIMESTAMP | NOT NULL | Son geçerlilik tarihi |
| is_used | BOOLEAN | DEFAULT FALSE | Kullanıldı mı |
| created_at | TIMESTAMP | NOT NULL | Oluşturulma tarihi |
| updated_at | TIMESTAMP | NOT NULL | Güncellenme tarihi |

---

### 7. email_verifications

E-posta doğrulama token'larını saklar.

| Kolon | Tip | Constraint | Açıklama |
|-------|-----|------------|----------|
| id | UUID | PK | Benzersiz tanımlayıcı |
| user_id | UUID | FK → users.id | Kullanıcı referansı |
| token | VARCHAR(500) | NOT NULL, UNIQUE | Verification token |
| expires_at | TIMESTAMP | NOT NULL | Son geçerlilik tarihi |
| is_used | BOOLEAN | DEFAULT FALSE | Kullanıldı mı |
| created_at | TIMESTAMP | NOT NULL | Oluşturulma tarihi |
| updated_at | TIMESTAMP | NOT NULL | Güncellenme tarihi |

---

## İlişkiler (Foreign Keys)

| Tablo | Kolon | Referans | ON DELETE |
|-------|-------|----------|-----------|
| students | user_id | users.id | CASCADE |
| students | department_id | departments.id | SET NULL |
| faculty | user_id | users.id | CASCADE |
| faculty | department_id | departments.id | SET NULL |
| refresh_tokens | user_id | users.id | CASCADE |
| password_resets | user_id | users.id | CASCADE |
| email_verifications | user_id | users.id | CASCADE |

---

## Seed Data

Sistem kurulumunda aşağıdaki test verileri oluşturulur:

### Bölümler
- Bilgisayar Mühendisliği (BM)
- Elektrik-Elektronik Mühendisliği (EE)
- Makine Mühendisliği (MAK)
- İşletme (ISL)
- Hukuk (HUK)

### Kullanıcılar
- 1 Admin
- 2 Öğretim Üyesi
- 5 Öğrenci

---

📅 Son Güncelleme: Aralık 2024

