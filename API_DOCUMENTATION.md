# 📘 API Dokümantasyonu - Part 1

## Genel Bilgiler

- **Base URL:** `http://localhost:5000/api/v1`
- **Format:** JSON
- **Authentication:** Bearer Token (JWT)

## HTTP Status Codes

| Code | Açıklama |
|------|----------|
| 200 | Başarılı |
| 201 | Kaynak oluşturuldu |
| 204 | İçerik yok (başarılı) |
| 400 | Geçersiz istek |
| 401 | Yetkilendirme gerekli |
| 403 | Erişim reddedildi |
| 404 | Bulunamadı |
| 409 | Çakışma (duplicate) |
| 500 | Sunucu hatası |

## Response Format

### Başarılı Response
```json
{
  "success": true,
  "message": "İşlem başarılı",
  "data": { ... }
}
```

### Hata Response
```json
{
  "success": false,
  "message": "Hata mesajı",
  "code": "ERROR_CODE",
  "errors": [
    {
      "field": "email",
      "message": "Geçerli bir e-posta adresi giriniz"
    }
  ]
}
```

---

## 🔐 Authentication Endpoints

### 1. Kullanıcı Kaydı

**POST** `/auth/register`

Yeni kullanıcı kaydı oluşturur.

#### Request Body

```json
{
  "email": "ogrenci@university.edu",
  "password": "Password123",
  "confirmPassword": "Password123",
  "firstName": "Mehmet",
  "lastName": "Demir",
  "role": "student",
  "studentNumber": "20240001",
  "departmentId": "uuid" // opsiyonel
}
```

#### Öğretim Üyesi için:

```json
{
  "email": "hoca@university.edu",
  "password": "Password123",
  "confirmPassword": "Password123",
  "firstName": "Ahmet",
  "lastName": "Yılmaz",
  "role": "faculty",
  "employeeNumber": "AK0001",
  "title": "professor",
  "departmentId": "uuid"
}
```

#### Response (201 Created)

```json
{
  "success": true,
  "message": "Kayıt başarılı. Lütfen e-posta adresinizi doğrulayın.",
  "data": {
    "id": "uuid",
    "email": "ogrenci@university.edu",
    "role": "student",
    "first_name": "Mehmet",
    "last_name": "Demir",
    "is_active": false,
    "is_verified": false
  }
}
```

#### Validasyon Kuralları

| Alan | Kural |
|------|-------|
| email | Geçerli e-posta formatı, benzersiz |
| password | Min 8 karakter, 1 büyük harf, 1 küçük harf, 1 rakam |
| role | "student" veya "faculty" |
| studentNumber | 8-12 rakam (öğrenci için) |
| employeeNumber | Min 4 karakter (öğretim üyesi için) |

---

### 2. E-posta Doğrulama

**POST** `/auth/verify-email`

E-posta adresini doğrular.

#### Request Body

```json
{
  "token": "jwt-verification-token"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "E-posta adresiniz başarıyla doğrulandı"
}
```

---

### 3. Kullanıcı Girişi

**POST** `/auth/login`

Kullanıcı girişi yapar.

#### Request Body

```json
{
  "email": "admin@university.edu",
  "password": "Admin123!"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Giriş başarılı",
  "data": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token",
    "user": {
      "id": "uuid",
      "email": "admin@university.edu",
      "role": "admin",
      "first_name": "Sistem",
      "last_name": "Yöneticisi",
      "is_active": true,
      "is_verified": true,
      "student": null,
      "faculty": null
    }
  }
}
```

---

### 4. Token Yenileme

**POST** `/auth/refresh`

Access token'ı yeniler.

#### Request Body

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Token yenilendi",
  "data": {
    "accessToken": "new-jwt-access-token"
  }
}
```

---

### 5. Çıkış Yapma

**POST** `/auth/logout`

Kullanıcı çıkışı yapar.

#### Request Body

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

#### Response (204 No Content)

Boş response

---

### 6. Şifre Sıfırlama İsteği

**POST** `/auth/forgot-password`

Şifre sıfırlama e-postası gönderir.

#### Request Body

```json
{
  "email": "kullanici@university.edu"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi"
}
```

> **Not:** Güvenlik için e-posta var olsa da olmasa da aynı mesaj döner.

---

### 7. Şifre Sıfırlama

**POST** `/auth/reset-password`

Yeni şifre belirler.

#### Request Body

```json
{
  "token": "jwt-reset-token",
  "password": "NewPassword123",
  "confirmPassword": "NewPassword123"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Şifreniz başarıyla sıfırlandı. Yeni şifrenizle giriş yapabilirsiniz."
}
```

---

## 👤 User Management Endpoints

> **Not:** Tüm user endpoint'leri `Authorization: Bearer <token>` header'ı gerektirir.

### 1. Profil Görüntüleme

**GET** `/users/me`

Giriş yapmış kullanıcının profilini getirir.

#### Headers

```
Authorization: Bearer <access-token>
```

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "ogrenci@university.edu",
    "role": "student",
    "first_name": "Mehmet",
    "last_name": "Demir",
    "phone": "+905551234567",
    "profile_picture_url": "/uploads/profile.jpg",
    "is_active": true,
    "is_verified": true,
    "student": {
      "id": "uuid",
      "student_number": "20210001",
      "gpa": 3.45,
      "cgpa": 3.40,
      "current_semester": 6,
      "department": {
        "id": "uuid",
        "name": "Bilgisayar Mühendisliği",
        "code": "BM"
      }
    }
  }
}
```

---

### 2. Profil Güncelleme

**PUT** `/users/me`

Profil bilgilerini günceller.

#### Request Body

```json
{
  "firstName": "Mehmet",
  "lastName": "Demir",
  "phone": "+905551234567"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Profil güncellendi",
  "data": {
    "id": "uuid",
    "first_name": "Mehmet",
    "last_name": "Demir",
    "phone": "+905551234567"
  }
}
```

---

### 3. Profil Fotoğrafı Yükleme

**POST** `/users/me/profile-picture`

Profil fotoğrafı yükler.

#### Request

- **Content-Type:** `multipart/form-data`
- **Field name:** `profilePicture`
- **Allowed types:** JPG, PNG
- **Max size:** 5MB

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Profil fotoğrafı güncellendi",
  "data": {
    "profilePictureUrl": "/uploads/abc123.jpg"
  }
}
```

---

### 4. Şifre Değiştirme

**PUT** `/users/me/password`

Kullanıcı şifresini değiştirir.

#### Request Body

```json
{
  "currentPassword": "CurrentPassword123",
  "newPassword": "NewPassword123",
  "confirmPassword": "NewPassword123"
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Şifreniz başarıyla değiştirildi"
}
```

---

### 5. Kullanıcı Listesi (Admin)

**GET** `/users`

Tüm kullanıcıları listeler. **Sadece admin erişebilir.**

#### Query Parameters

| Parametre | Tip | Açıklama |
|-----------|-----|----------|
| page | number | Sayfa numarası (default: 1) |
| limit | number | Sayfa başı kayıt (default: 10, max: 100) |
| role | string | Role göre filtre (student, faculty, admin) |
| departmentId | uuid | Bölüme göre filtre |
| search | string | İsim veya e-posta araması |
| sortBy | string | Sıralama alanı |
| sortOrder | string | asc veya desc |

#### Response (200 OK)

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "ogrenci@university.edu",
      "role": "student",
      "first_name": "Mehmet",
      "last_name": "Demir"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

---

### 6. Kullanıcı Detay (Admin)

**GET** `/users/:id`

Belirli kullanıcının detaylarını getirir.

#### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "kullanici@university.edu",
    ...
  }
}
```

---

### 7. Kullanıcı Durumu Güncelleme (Admin)

**PATCH** `/users/:id/status`

Kullanıcı aktif/pasif durumunu değiştirir.

#### Request Body

```json
{
  "isActive": false
}
```

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Kullanıcı devre dışı bırakıldı",
  "data": { ... }
}
```

---

### 8. Kullanıcı Silme (Admin)

**DELETE** `/users/:id`

Kullanıcıyı devre dışı bırakır (soft delete).

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Kullanıcı başarıyla silindi"
}
```

---

## Error Codes

| Code | Açıklama |
|------|----------|
| AUTH_REQUIRED | Yetkilendirme gerekli |
| INVALID_TOKEN | Geçersiz token |
| TOKEN_EXPIRED | Token süresi dolmuş |
| FORBIDDEN | Yetkisiz erişim |
| VALIDATION_ERROR | Validasyon hatası |
| DUPLICATE_ENTRY | Kayıt zaten mevcut |
| NOT_FOUND | Kayıt bulunamadı |
| LOGIN_ERROR | Giriş hatası |
| SERVER_ERROR | Sunucu hatası |

---

📅 Son Güncelleme: Aralık 2024

