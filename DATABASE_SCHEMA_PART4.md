# Part 4 - Database Schema Update

## New Tables

### notifications
| Column | Type | Description |
|--------|------|-------------|
| id | INT PRIMARY KEY | Auto-increment |
| user_id | INT FK | users.id |
| title | VARCHAR(255) | Bildirim başlığı |
| message | TEXT | Bildirim içeriği |
| category | ENUM | academic, attendance, meal, event, payment, system |
| type | ENUM | info, warning, success, error |
| read | BOOLEAN | Okundu mu |
| read_at | DATETIME | Okunma zamanı |
| action_url | VARCHAR(500) | Tıklanınca yönlendirilecek URL |
| metadata | JSON | Ek veri |
| created_at | DATETIME | |
| updated_at | DATETIME | |

**Indexes:** user_id, category, read, created_at

### notification_preferences
| Column | Type | Description |
|--------|------|-------------|
| id | INT PRIMARY KEY | Auto-increment |
| user_id | INT FK UNIQUE | users.id |
| email_academic | BOOLEAN | Default: true |
| email_attendance | BOOLEAN | Default: true |
| email_meal | BOOLEAN | Default: false |
| email_event | BOOLEAN | Default: true |
| email_payment | BOOLEAN | Default: true |
| email_system | BOOLEAN | Default: true |
| push_academic | BOOLEAN | Default: true |
| push_attendance | BOOLEAN | Default: true |
| push_meal | BOOLEAN | Default: true |
| push_event | BOOLEAN | Default: true |
| push_payment | BOOLEAN | Default: true |
| push_system | BOOLEAN | Default: false |
| sms_attendance | BOOLEAN | Default: true |
| sms_payment | BOOLEAN | Default: false |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### sensors (IoT - Bonus)
| Column | Type | Description |
|--------|------|-------------|
| id | INT PRIMARY KEY | Auto-increment |
| sensor_id | VARCHAR(50) UNIQUE | Sensör kodu |
| name | VARCHAR(100) | Sensör adı |
| type | ENUM | temperature, humidity, occupancy, energy, air_quality, light |
| location | VARCHAR(255) | Konum açıklaması |
| building | VARCHAR(100) | Bina |
| room | VARCHAR(50) | Oda |
| unit | VARCHAR(20) | Ölçü birimi |
| min_value | FLOAT | Minimum değer |
| max_value | FLOAT | Maximum değer |
| threshold_low | FLOAT | Düşük eşik uyarısı |
| threshold_high | FLOAT | Yüksek eşik uyarısı |
| status | ENUM | active, inactive, maintenance, error |
| last_reading | FLOAT | Son okuma değeri |
| last_reading_at | DATETIME | Son okuma zamanı |
| metadata | JSON | Ek veri |
| created_at | DATETIME | |
| updated_at | DATETIME | |

**Indexes:** sensor_id, type, status, building

### sensor_data (IoT - Bonus)
| Column | Type | Description |
|--------|------|-------------|
| id | BIGINT PRIMARY KEY | Auto-increment |
| sensor_id | INT FK | sensors.id |
| value | FLOAT | Ölçüm değeri |
| unit | VARCHAR(20) | Ölçü birimi |
| timestamp | DATETIME | Ölçüm zamanı |
| quality | ENUM | good, uncertain, bad |
| metadata | JSON | Ek veri |

**Indexes:** sensor_id, timestamp, (sensor_id, timestamp)

---

## Relationships

```
User (1) --- (N) Notification
User (1) --- (1) NotificationPreference
Sensor (1) --- (N) SensorData
```

## Total Tables: 31+
- Part 1: users, students, faculty, departments, refresh_tokens, password_resets, email_verifications
- Part 2: courses, course_sections, course_prerequisites, classrooms, enrollments, attendance_sessions, attendance_records, excuse_requests
- Part 3: academic_calendars, announcements
- Part 4: cafeterias, meal_menus, meal_reservations, wallets, transactions, events, event_registrations, schedules, reservations, notifications, notification_preferences, sensors, sensor_data
