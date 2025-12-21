# API Documentation - Part 3

## Meal Endpoints

### Base Path: `/api/v1/meals`

#### 1. Get Cafeterias
**GET** `/cafeterias`

Get list of active cafeterias.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Batı Kampüs",
      "location": "Batı Kampüs Kafeteryası",
      "capacity": 500,
      "is_active": true
    }
  ]
}
```

#### 2. Get Menus
**GET** `/menus`

Get meal menus with optional filters.

**Authentication:** Required

**Query Parameters:**
- `date` (optional): Filter by date (YYYY-MM-DD)
- `cafeteria_id` (optional): Filter by cafeteria
- `meal_type` (optional): Filter by meal type (breakfast, lunch, dinner)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "cafeteria_id": "uuid",
      "meal_type": "lunch",
      "date": "2024-12-25",
      "items": ["Item 1", "Item 2"],
      "is_published": true
    }
  ]
}
```

#### 3. Get Menu by ID
**GET** `/menus/:id`

Get specific menu details.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "cafeteria_id": "uuid",
    "meal_type": "lunch",
    "date": "2024-12-25",
    "items": ["Item 1", "Item 2"],
    "is_published": true
  }
}
```

#### 4. Create Menu
**POST** `/menus`

Create a new meal menu (Admin/Cafeteria Staff only).

**Authentication:** Required  
**Authorization:** `admin`, `cafeteria_staff`

**Request Body:**
```json
{
  "cafeteria_id": "uuid",
  "meal_type": "lunch",
  "date": "2024-12-25",
  "items": ["Item 1", "Item 2"],
  "is_published": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Menü oluşturuldu",
  "data": { /* menu object */ }
}
```

#### 5. Update Menu
**PUT** `/menus/:id`

Update an existing menu (Admin/Cafeteria Staff only).

**Authentication:** Required  
**Authorization:** `admin`, `cafeteria_staff`

**Request Body:** Same as Create Menu

#### 6. Delete Menu
**DELETE** `/menus/:id`

Delete a menu (Admin/Cafeteria Staff only).

**Authentication:** Required  
**Authorization:** `admin`, `cafeteria_staff`

#### 7. Create Meal Reservation
**POST** `/reservations`

Create a meal reservation.

**Authentication:** Required

**Request Body:**
```json
{
  "menu_id": "uuid",
  "cafeteria_id": "uuid",
  "meal_type": "lunch",
  "date": "2024-12-25"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Yemek rezervasyonu oluşturuldu",
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "menu_id": "uuid",
    "qr_code": "MEAL-1234567890ABCDEF",
    "status": "reserved",
    "amount": 0
  }
}
```

#### 8. Cancel Reservation
**DELETE** `/reservations/:id`

Cancel a meal reservation (must be >= 2 hours before meal time).

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Rezervasyon iptal edildi"
}
```

#### 9. Get My Reservations
**GET** `/reservations/my-reservations`

Get current user's meal reservations.

**Authentication:** Required

**Query Parameters:**
- `status` (optional): Filter by status
- `date_from` (optional): Filter from date
- `date_to` (optional): Filter to date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "menu_id": "uuid",
      "qr_code": "MEAL-1234567890ABCDEF",
      "status": "reserved",
      "date": "2024-12-25",
      "meal_type": "lunch",
      "menu": { /* menu object */ },
      "cafeteria": { /* cafeteria object */ }
    }
  ]
}
```

#### 10. Get Reservation by QR Code
**GET** `/reservations/qr/:qrCode`

Get reservation details by QR code (Admin/Cafeteria Staff only).

**Authentication:** Required  
**Authorization:** `admin`, `cafeteria_staff`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "qr_code": "MEAL-1234567890ABCDEF",
    "status": "reserved",
    "user": { /* user object */ },
    "menu": { /* menu object */ }
  }
}
```

#### 11. Use Reservation
**POST** `/reservations/:id/use`

Mark reservation as used (Cafeteria Staff only).

**Authentication:** Required  
**Authorization:** `admin`, `cafeteria_staff`

**Request Body:**
```json
{
  "qr_code": "MEAL-1234567890ABCDEF"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rezervasyon kullanıldı"
}
```

#### 12. Transfer Reservation
**POST** `/reservations/:id/transfer`

Transfer reservation to another student.

**Authentication:** Required

**Request Body:**
```json
{
  "student_number": "20240001"
}
```

## Event Endpoints

### Base Path: `/api/v1/events`

#### 1. Get Events
**GET** `/`

Get list of events with optional filters.

**Authentication:** Required

**Query Parameters:**
- `category` (optional): Filter by category
- `date_from` (optional): Filter from date
- `date_to` (optional): Filter to date
- `status` (optional): Filter by status

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Event Title",
      "description": "Event description",
      "category": "Workshop",
      "date": "2024-12-25",
      "start_time": "10:00:00",
      "end_time": "12:00:00",
      "location": "Location",
      "capacity": 50,
      "registered_count": 20,
      "status": "published"
    }
  ]
}
```

#### 2. Get Event by ID
**GET** `/:id`

Get specific event details.

**Authentication:** Required

#### 3. Create Event
**POST** `/`

Create a new event (Admin/Event Manager only).

**Authentication:** Required  
**Authorization:** `admin`, `event_manager`

**Request Body:**
```json
{
  "title": "Event Title",
  "description": "Event description",
  "category": "Workshop",
  "date": "2024-12-25",
  "start_time": "10:00:00",
  "end_time": "12:00:00",
  "location": "Location",
  "capacity": 50,
  "registration_deadline": "2024-12-24",
  "is_paid": false,
  "price": 0
}
```

#### 4. Update Event
**PUT** `/:id`

Update an existing event (Admin/Event Manager only).

**Authentication:** Required  
**Authorization:** `admin`, `event_manager`

#### 5. Delete Event
**DELETE** `/:id`

Delete an event (Admin/Event Manager only).

**Authentication:** Required  
**Authorization:** `admin`, `event_manager`

#### 6. Register for Event
**POST** `/:id/register`

Register for an event.

**Authentication:** Required

**Request Body:**
```json
{
  "custom_fields": {
    "dietary_requirements": "Vegetarian"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Etkinliğe kayıt yapıldı",
  "data": {
    "id": "uuid",
    "event_id": "uuid",
    "user_id": "uuid",
    "qr_code": "EVENT-1234567890ABCDEF",
    "status": "registered",
    "checked_in": false
  }
}
```

#### 7. Cancel Registration
**DELETE** `/:eventId/registrations/:regId`

Cancel event registration.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "message": "Kayıt iptal edildi"
}
```

#### 8. Get My Event Registrations
**GET** `/my-registrations`

Get current user's event registrations.

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "event_id": "uuid",
      "qr_code": "EVENT-1234567890ABCDEF",
      "status": "registered",
      "checked_in": false,
      "event": { /* event object */ }
    }
  ]
}
```

#### 9. Get Event Registrations
**GET** `/:id/registrations`

Get all registrations for an event (Event Manager only).

**Authentication:** Required  
**Authorization:** `admin`, `event_manager`

#### 10. Get Registration by QR Code
**GET** `/registrations/qr/:qrCode`

Get registration details by QR code (Event Manager only).

**Authentication:** Required  
**Authorization:** `admin`, `event_manager`

#### 11. Check In to Event
**POST** `/:eventId/registrations/:regId/checkin`

Check in a participant to an event (Event Manager only).

**Authentication:** Required  
**Authorization:** `admin`, `event_manager`

**Request Body:**
```json
{
  "qr_code": "EVENT-1234567890ABCDEF"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Giriş başarılı",
  "data": { /* user object */ }
}
```

## Scheduling Endpoints

### Base Path: `/api/v1/scheduling`

#### 1. Generate Schedule
**POST** `/generate`

Generate automatic course schedule using CSP algorithm (Admin only).

**Authentication:** Required  
**Authorization:** `admin`

**Request Body:**
```json
{
  "sections": [
    {
      "id": "uuid",
      "course_id": "uuid",
      "instructor_id": "uuid",
      "capacity": 30,
      "course_requirements": {}
    }
  ],
  "classrooms": [
    {
      "id": "uuid",
      "capacity": 40,
      "features": {}
    }
  ],
  "timeSlots": [
    {
      "day_of_week": "monday",
      "start_time": "09:00",
      "end_time": "17:00"
    }
  ],
  "instructorPreferences": {}
}
```

**Response:**
```json
{
  "success": true,
  "message": "Ders programı oluşturuldu",
  "data": {
    "schedule": [ /* schedule records */ ],
    "stats": {
      "totalSections": 10,
      "assignedSections": 10,
      "unassignedSections": 0,
      "averageClassroomUsage": 2.5
    }
  }
}
```

#### 2. Get Schedule
**GET** `/:scheduleId`

Get schedule by ID (or all schedules if scheduleId not provided).

**Authentication:** Required

#### 3. Get My Schedule
**GET** `/my-schedule`

Get current user's schedule (student or faculty).

**Authentication:** Required

**Response:**
```json
{
  "success": true,
  "data": {
    "monday": [
      {
        "id": "uuid",
        "course": "CS101",
        "courseName": "Introduction to Computer Science",
        "startTime": "09:00",
        "endTime": "10:30",
        "classroom": "Building A Room 101",
        "instructor": "John Doe"
      }
    ],
    "tuesday": [ /* ... */ ]
  }
}
```

#### 4. Get iCal Export
**GET** `/my-schedule/ical`

Export user's schedule as iCal file.

**Authentication:** Required

**Response:** iCal file content (text/calendar)

## Classroom Reservation Endpoints

### Base Path: `/api/v1/reservations`

#### 1. Create Classroom Reservation
**POST** `/`

Create a classroom reservation.

**Authentication:** Required

**Request Body:**
```json
{
  "classroom_id": "uuid",
  "date": "2024-12-25",
  "start_time": "09:00",
  "end_time": "10:00",
  "purpose": "Ders"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Derslik rezervasyonu oluşturuldu",
  "data": {
    "id": "uuid",
    "classroom_id": "uuid",
    "user_id": "uuid",
    "date": "2024-12-25",
    "start_time": "09:00",
    "end_time": "10:00",
    "status": "pending",
    "purpose": "Ders"
  }
}
```

#### 2. Get Reservations
**GET** `/`

Get classroom reservations with filters.

**Authentication:** Required

**Query Parameters:**
- `date` (optional): Filter by date
- `classroom_id` (optional): Filter by classroom
- `user_id` (optional): Filter by user

#### 3. Approve Reservation
**PUT** `/:id/approve`

Approve a pending reservation (Admin only).

**Authentication:** Required  
**Authorization:** `admin`

#### 4. Reject Reservation
**PUT** `/:id/reject`

Reject a pending reservation (Admin only).

**Authentication:** Required  
**Authorization:** `admin`

**Request Body:**
```json
{
  "reason": "Conflict with another reservation"
}
```

## Payment Webhook

### Base Path: `/api/v1/wallet`

#### Process Top-up Webhook
**POST** `/topup/webhook`

Process payment webhook from payment gateway (Stripe/PayTR).

**Authentication:** Not required (webhook signature verification)

**Request Body:**
```json
{
  "walletId": "uuid",
  "amount": 100,
  "paymentId": "pay_123456789",
  "metadata": {
    "userId": "uuid"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "transaction": { /* transaction object */ },
    "newBalance": 150
  }
}
```

**Note:** Webhook signature should be verified in production using the payment gateway's signature verification method.

