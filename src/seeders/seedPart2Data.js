/**
 * Part 2 Seed Data
 * Seeds courses, sections, classrooms, enrollments, and sample attendance data
 * 
 * Usage: node src/seeders/seedPart2Data.js
 */

require('dotenv').config();
const db = require('../models');
const { hashPassword } = require('../utils/password');

const {
  User,
  Student,
  Faculty,
  Department,
  Course,
  Classroom,
  CourseSection,
  CoursePrerequisite,
  Enrollment,
  AttendanceSession,
  AttendanceRecord,
} = db;

// Sample data
const classrooms = [
  {
    building: 'Mühendislik Fakültesi',
    room_number: 'A101',
    capacity: 50,
    floor: 1,
    latitude: 41.0082,
    longitude: 28.9784,
    features_json: ['projector', 'whiteboard', 'computer', 'air_conditioning'],
  },
  {
    building: 'Mühendislik Fakültesi',
    room_number: 'A102',
    capacity: 40,
    floor: 1,
    latitude: 41.0083,
    longitude: 28.9785,
    features_json: ['projector', 'whiteboard'],
  },
  {
    building: 'Mühendislik Fakültesi',
    room_number: 'B201',
    capacity: 60,
    floor: 2,
    latitude: 41.0084,
    longitude: 28.9786,
    features_json: ['projector', 'whiteboard', 'computer', 'lab_equipment'],
  },
  {
    building: 'İşletme Fakültesi',
    room_number: 'C101',
    capacity: 80,
    floor: 1,
    latitude: 41.0090,
    longitude: 28.9790,
    features_json: ['projector', 'whiteboard', 'air_conditioning'],
  },
  {
    building: 'Fen Fakültesi',
    room_number: 'D301',
    capacity: 30,
    floor: 3,
    latitude: 41.0095,
    longitude: 28.9795,
    features_json: ['projector', 'whiteboard', 'lab_equipment'],
  },
];

const courses = [
  // Computer Engineering courses
  {
    code: 'CSE101',
    name: 'Programlamaya Giriş',
    description: 'Programlama temellerini öğreten başlangıç dersi. Python programlama dili ile algoritma geliştirme, veri yapıları ve problem çözme teknikleri.',
    credits: 4,
    ects: 6,
    department_code: 'CSE',
    prerequisites: [],
  },
  {
    code: 'CSE102',
    name: 'Nesne Yönelimli Programlama',
    description: 'Java ile nesne yönelimli programlama konseptleri. Sınıflar, kalıtım, polimorfizm ve tasarım kalıpları.',
    credits: 4,
    ects: 6,
    department_code: 'CSE',
    prerequisites: [], // Önkoşul kaldırıldı - daha fazla ders alınabilmesi için
  },
  {
    code: 'CSE201',
    name: 'Veri Yapıları',
    description: 'Temel veri yapıları ve algoritmalar. Diziler, bağlı listeler, yığınlar, kuyruklar, ağaçlar ve graflar.',
    credits: 4,
    ects: 7,
    department_code: 'CSE',
    prerequisites: [], // Önkoşul kaldırıldı - daha fazla ders alınabilmesi için
  },
  {
    code: 'CSE202',
    name: 'Veritabanı Yönetimi',
    description: 'İlişkisel veritabanları, SQL, normalizasyon ve veritabanı tasarımı.',
    credits: 3,
    ects: 5,
    department_code: 'CSE',
    prerequisites: [], // Önkoşul kaldırıldı - daha fazla ders alınabilmesi için
  },
  {
    code: 'CSE301',
    name: 'Yazılım Mühendisliği',
    description: 'Yazılım geliştirme süreçleri, çevik metodolojiler, test ve kalite güvence.',
    credits: 3,
    ects: 5,
    department_code: 'CSE',
    prerequisites: [], // Önkoşul kaldırıldı - daha fazla ders alınabilmesi için
  },
  {
    code: 'CSE302',
    name: 'Web Programlama',
    description: 'Modern web teknolojileri: HTML5, CSS3, JavaScript, React, Node.js.',
    credits: 3,
    ects: 5,
    department_code: 'CSE',
    prerequisites: [], // Önkoşul kaldırıldı - daha fazla ders alınabilmesi için
  },
  {
    code: 'CSE103',
    name: 'Algoritma ve Programlama',
    description: 'Temel algoritma tasarımı ve problem çözme teknikleri.',
    credits: 3,
    ects: 5,
    department_code: 'CSE',
    prerequisites: [],
  },
  {
    code: 'CSE203',
    name: 'Bilgisayar Ağları',
    description: 'Ağ protokolleri, TCP/IP, OSI modeli ve ağ güvenliği.',
    credits: 3,
    ects: 5,
    department_code: 'CSE',
    prerequisites: [],
  },
  // Math courses
  {
    code: 'MATH101',
    name: 'Matematik I',
    description: 'Kalkülüs temelleri: limitler, türevler ve uygulamaları.',
    credits: 4,
    ects: 6,
    department_code: 'MATH',
    prerequisites: [],
  },
  {
    code: 'MATH102',
    name: 'Matematik II',
    description: 'İntegral hesabı ve çok değişkenli fonksiyonlar.',
    credits: 4,
    ects: 6,
    department_code: 'MATH',
    prerequisites: [], // Önkoşul kaldırıldı - daha fazla ders alınabilmesi için
  },
  {
    code: 'MATH201',
    name: 'Lineer Cebir',
    description: 'Matrisler, vektör uzayları, lineer dönüşümler.',
    credits: 3,
    ects: 5,
    department_code: 'MATH',
    prerequisites: [], // Önkoşul kaldırıldı - daha fazla ders alınabilmesi için
  },
  {
    code: 'MATH103',
    name: 'Ayrık Matematik',
    description: 'Mantık, küme teorisi, graf teorisi ve kombinatoryal analiz.',
    credits: 3,
    ects: 5,
    department_code: 'MATH',
    prerequisites: [],
  },
  {
    code: 'MATH202',
    name: 'Olasılık ve İstatistik',
    description: 'Temel olasılık teorisi, rastgele değişkenler ve istatistiksel analiz.',
    credits: 3,
    ects: 5,
    department_code: 'MATH',
    prerequisites: [],
  },
  // Physics courses
  {
    code: 'PHYS101',
    name: 'Fizik I',
    description: 'Mekanik: hareket, kuvvetler, enerji ve momentum.',
    credits: 4,
    ects: 6,
    department_code: 'PHYS',
    prerequisites: [],
  },
  {
    code: 'PHYS102',
    name: 'Fizik II',
    description: 'Elektrik ve manyetizma.',
    credits: 4,
    ects: 6,
    department_code: 'PHYS',
    prerequisites: [], // Önkoşul kaldırıldı - daha fazla ders alınabilmesi için
  },
  {
    code: 'PHYS103',
    name: 'Modern Fizik',
    description: 'Kuantum mekaniği, özel görelilik ve atom fiziği.',
    credits: 3,
    ects: 5,
    department_code: 'PHYS',
    prerequisites: [],
  },
  // Business courses
  {
    code: 'BUS101',
    name: 'İşletmeye Giriş',
    description: 'İşletme yönetiminin temelleri.',
    credits: 3,
    ects: 5,
    department_code: 'BA',
    prerequisites: [],
  },
  {
    code: 'BUS201',
    name: 'Finansal Yönetim',
    description: 'Finansal analiz ve yönetim teknikleri.',
    credits: 3,
    ects: 5,
    department_code: 'BA',
    prerequisites: [], // Önkoşul kaldırıldı - daha fazla ders alınabilmesi için
  },
  {
    code: 'BUS103',
    name: 'Pazarlama İlkeleri',
    description: 'Pazarlama stratejileri, tüketici davranışı ve marka yönetimi.',
    credits: 3,
    ects: 5,
    department_code: 'BA',
    prerequisites: [],
  },
  {
    code: 'BUS202',
    name: 'İnsan Kaynakları Yönetimi',
    description: 'İK süreçleri, işe alım, eğitim ve performans yönetimi.',
    credits: 3,
    ects: 5,
    department_code: 'BA',
    prerequisites: [],
  },
  // Genel Seçmeli Dersler
  {
    code: 'ENG101',
    name: 'İngilizce I',
    description: 'Temel İngilizce dilbilgisi, kelime dağarcığı ve iletişim becerileri.',
    credits: 2,
    ects: 3,
    department_code: 'BA', // Genel seçmeli
    prerequisites: [],
  },
  {
    code: 'ENG102',
    name: 'İngilizce II',
    description: 'İleri düzey İngilizce, akademik yazma ve sunum teknikleri.',
    credits: 2,
    ects: 3,
    department_code: 'BA', // Genel seçmeli
    prerequisites: [],
  },
  {
    code: 'HIST101',
    name: 'Türk Tarihi',
    description: 'Türkiye tarihinin önemli dönemleri ve olayları.',
    credits: 2,
    ects: 3,
    department_code: 'BA', // Genel seçmeli
    prerequisites: [],
  },
  {
    code: 'ART101',
    name: 'Sanat Tarihi',
    description: 'Dünya sanat tarihi, önemli sanat akımları ve eserler.',
    credits: 2,
    ects: 3,
    department_code: 'BA', // Genel seçmeli
    prerequisites: [],
  },
  {
    code: 'MUS101',
    name: 'Müzik Kültürü',
    description: 'Müzik tarihi, farklı müzik türleri ve kültürel etkiler.',
    credits: 2,
    ects: 3,
    department_code: 'BA', // Genel seçmeli
    prerequisites: [],
  },
  {
    code: 'PHIL101',
    name: 'Felsefeye Giriş',
    description: 'Temel felsefi düşünce, etik ve mantık.',
    credits: 2,
    ects: 3,
    department_code: 'BA', // Genel seçmeli
    prerequisites: [],
  },
];

async function seed() {
  try {
    console.log('🌱 Part 2 Seed başlatılıyor...\n');

    // Sync database - force: true for fresh database
    await db.sequelize.sync({ force: true });
    console.log('✅ Veritabanı tabloları oluşturuldu\n');

    // Create test users
    console.log('👤 Test kullanıcıları oluşturuluyor...');
    const hashedPassword = await hashPassword('Test123!');

    // Admin user
    const [adminUser] = await User.findOrCreate({
      where: { email: 'admin@university.edu.tr' },
      defaults: {
        email: 'admin@university.edu.tr',
        password_hash: hashedPassword,
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
        is_active: true,
        is_verified: true,
      },
    });

    // Create departments first for faculty/student
    const defaultDepartments = [
      { code: 'CSE', name: 'Bilgisayar Mühendisliği', faculty: 'Mühendislik Fakültesi' },
      { code: 'MATH', name: 'Matematik', faculty: 'Fen Fakültesi' },
      { code: 'PHYS', name: 'Fizik', faculty: 'Fen Fakültesi' },
      { code: 'BA', name: 'İşletme', faculty: 'İşletme Fakültesi' },
    ];

    for (const dept of defaultDepartments) {
      await Department.findOrCreate({
        where: { code: dept.code },
        defaults: dept,
      });
    }
    console.log('✅ Bölümler oluşturuldu');

    const cseDept = await Department.findOne({ where: { code: 'CSE' } });
    const mathDept = await Department.findOne({ where: { code: 'MATH' } });
    const physDept = await Department.findOne({ where: { code: 'PHYS' } });
    const baDept = await Department.findOne({ where: { code: 'BA' } });

    // Faculty user - CSE Department
    const [facultyUser] = await User.findOrCreate({
      where: { email: 'faculty@university.edu.tr' },
      defaults: {
        email: 'faculty@university.edu.tr',
        password_hash: hashedPassword,
        first_name: 'Ahmet',
        last_name: 'Öğretim Üyesi',
        role: 'faculty',
        is_active: true,
        is_verified: true,
      },
    });
    const [cseFaculty] = await Faculty.findOrCreate({
      where: { user_id: facultyUser.id },
      defaults: {
        user_id: facultyUser.id,
        employee_number: 'FAC2024001',
        department_id: cseDept?.id || null,
        title: 'associate_professor',
        office_location: 'A-301',
      },
    });

    // Create faculty for other departments
    // MATH Faculty
    const [mathFacultyUser] = await User.findOrCreate({
      where: { email: 'math.faculty@university.edu.tr' },
      defaults: {
        email: 'math.faculty@university.edu.tr',
        password_hash: hashedPassword,
        first_name: 'Ayşe',
        last_name: 'Matematik Hoca',
        role: 'faculty',
        is_active: true,
        is_verified: true,
      },
    });
    const [mathFaculty] = await Faculty.findOrCreate({
      where: { user_id: mathFacultyUser.id },
      defaults: {
        user_id: mathFacultyUser.id,
        employee_number: 'FAC2024002',
        department_id: mathDept?.id || null,
        title: 'professor',
        office_location: 'B-201',
      },
    });

    // PHYS Faculty
    const [physFacultyUser] = await User.findOrCreate({
      where: { email: 'physics.faculty@university.edu.tr' },
      defaults: {
        email: 'physics.faculty@university.edu.tr',
        password_hash: hashedPassword,
        first_name: 'Mehmet',
        last_name: 'Fizik Hoca',
        role: 'faculty',
        is_active: true,
        is_verified: true,
      },
    });
    const [physFaculty] = await Faculty.findOrCreate({
      where: { user_id: physFacultyUser.id },
      defaults: {
        user_id: physFacultyUser.id,
        employee_number: 'FAC2024003',
        department_id: physDept?.id || null,
        title: 'associate_professor',
        office_location: 'C-101',
      },
    });

    // BA Faculty
    const [baFacultyUser] = await User.findOrCreate({
      where: { email: 'business.faculty@university.edu.tr' },
      defaults: {
        email: 'business.faculty@university.edu.tr',
        password_hash: hashedPassword,
        first_name: 'Fatma',
        last_name: 'İşletme Hoca',
        role: 'faculty',
        is_active: true,
        is_verified: true,
      },
    });
    const [baFaculty] = await Faculty.findOrCreate({
      where: { user_id: baFacultyUser.id },
      defaults: {
        user_id: baFacultyUser.id,
        employee_number: 'FAC2024004',
        department_id: baDept?.id || null,
        title: 'assistant_professor',
        office_location: 'D-301',
      },
    });

    // Student user
    const [studentUser] = await User.findOrCreate({
      where: { email: 'student@university.edu.tr' },
      defaults: {
        email: 'student@university.edu.tr',
        password_hash: hashedPassword,
        first_name: 'Mehmet',
        last_name: 'Öğrenci',
        role: 'student',
        is_active: true,
        is_verified: true,
      },
    });
    await Student.findOrCreate({
      where: { user_id: studentUser.id },
      defaults: {
        user_id: studentUser.id,
        student_number: '2024001001',
        department_id: cseDept?.id || null,
        enrollment_date: new Date(),
        current_semester: 1,
        status: 'active',
      },
    });

    console.log('✅ Test kullanıcıları oluşturuldu:');
    console.log('   - Admin: admin@university.edu.tr / Test123!');
    console.log('   - CSE Öğretim Üyesi: faculty@university.edu.tr / Test123!');
    console.log('   - MATH Öğretim Üyesi: math.faculty@university.edu.tr / Test123!');
    console.log('   - PHYS Öğretim Üyesi: physics.faculty@university.edu.tr / Test123!');
    console.log('   - BA Öğretim Üyesi: business.faculty@university.edu.tr / Test123!');
    console.log('   - Öğrenci: student@university.edu.tr / Test123!\n');

    // Create faculty map for section assignment
    const facultyByDept = {
      'CSE': cseFaculty,
      'MATH': mathFaculty,
      'PHYS': physFaculty,
      'BA': baFaculty,
    };

    // Get existing departments
    const departments = await Department.findAll();
    if (departments.length === 0) {
      console.log('⚠️ Bölümler bulunamadı. Önce Part 1 seed çalıştırılmalı.');

      // Create basic departments
      const defaultDepts = [
        { code: 'CSE', name: 'Bilgisayar Mühendisliği', faculty: 'Mühendislik Fakültesi' },
        { code: 'MATH', name: 'Matematik', faculty: 'Fen Fakültesi' },
        { code: 'PHYS', name: 'Fizik', faculty: 'Fen Fakültesi' },
        { code: 'BA', name: 'İşletme', faculty: 'İşletme Fakültesi' },
      ];

      for (const dept of defaultDepts) {
        await Department.findOrCreate({
          where: { code: dept.code },
          defaults: dept,
        });
      }
      console.log('✅ Varsayılan bölümler oluşturuldu\n');
    }

    // Refresh departments
    const allDepartments = await Department.findAll();
    const deptMap = {};
    allDepartments.forEach((d) => {
      deptMap[d.code] = d.id;
    });

    // Create classrooms
    console.log('📍 Derslikler oluşturuluyor...');
    for (const classroom of classrooms) {
      await Classroom.findOrCreate({
        where: { building: classroom.building, room_number: classroom.room_number },
        defaults: classroom,
      });
    }
    console.log(`✅ ${classrooms.length} derslik oluşturuldu\n`);

    // Create courses
    console.log('📚 Dersler oluşturuluyor...');
    const courseMap = {};
    for (const course of courses) {
      const [created] = await Course.findOrCreate({
        where: { code: course.code },
        defaults: {
          code: course.code,
          name: course.name,
          description: course.description,
          credits: course.credits,
          ects: course.ects,
          department_id: deptMap[course.department_code] || null,
          is_active: true,
        },
      });
      courseMap[course.code] = created.id;
    }
    console.log(`✅ ${courses.length} ders oluşturuldu\n`);

    // Create prerequisites
    console.log('🔗 Önkoşullar oluşturuluyor...');
    let prereqCount = 0;
    for (const course of courses) {
      if (course.prerequisites.length > 0) {
        for (const prereqCode of course.prerequisites) {
          if (courseMap[prereqCode]) {
            await CoursePrerequisite.findOrCreate({
              where: {
                course_id: courseMap[course.code],
                prerequisite_course_id: courseMap[prereqCode],
              },
              defaults: {
                course_id: courseMap[course.code],
                prerequisite_course_id: courseMap[prereqCode],
                min_grade: 'DD',
              },
            });
            prereqCount++;
          }
        }
      }
    }
    console.log(`✅ ${prereqCount} önkoşul oluşturuldu\n`);

    // Get faculty members
    const facultyMembers = await Faculty.findAll({
      include: [{ model: User, as: 'user' }],
    });

    // Get classrooms
    const allClassrooms = await Classroom.findAll();

    // Create sections for current semester
    console.log('📅 Ders sectionları oluşturuluyor...');
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    let currentSemester;
    if (currentMonth >= 1 && currentMonth <= 5) {
      currentSemester = 'spring';
    } else if (currentMonth >= 6 && currentMonth <= 8) {
      currentSemester = 'summer';
    } else {
      currentSemester = 'fall';
    }

    // Çakışmayan schedule'lar - Her ders için farklı saat
    const sectionSchedules = [
      // Pazartesi-Çarşamba saatleri
      [{ day: 'monday', start_time: '09:00', end_time: '10:30' }, { day: 'wednesday', start_time: '09:00', end_time: '10:30' }],
      [{ day: 'monday', start_time: '11:00', end_time: '12:30' }, { day: 'wednesday', start_time: '11:00', end_time: '12:30' }],
      [{ day: 'monday', start_time: '13:00', end_time: '14:30' }, { day: 'wednesday', start_time: '13:00', end_time: '14:30' }],
      [{ day: 'monday', start_time: '14:30', end_time: '16:00' }, { day: 'wednesday', start_time: '14:30', end_time: '16:00' }],

      // Salı-Cuma saatleri
      [{ day: 'tuesday', start_time: '09:00', end_time: '10:30' }, { day: 'friday', start_time: '09:00', end_time: '10:30' }],
      [{ day: 'tuesday', start_time: '11:00', end_time: '12:30' }, { day: 'friday', start_time: '11:00', end_time: '12:30' }],
      [{ day: 'tuesday', start_time: '13:00', end_time: '14:30' }, { day: 'friday', start_time: '13:00', end_time: '14:30' }],
      [{ day: 'tuesday', start_time: '14:30', end_time: '16:00' }, { day: 'friday', start_time: '14:30', end_time: '16:00' }],

      // Pazartesi-Perşembe saatleri
      [{ day: 'monday', start_time: '09:00', end_time: '10:30' }, { day: 'thursday', start_time: '09:00', end_time: '10:30' }],
      [{ day: 'monday', start_time: '11:00', end_time: '12:30' }, { day: 'thursday', start_time: '11:00', end_time: '12:30' }],
      [{ day: 'monday', start_time: '13:00', end_time: '14:30' }, { day: 'thursday', start_time: '13:00', end_time: '14:30' }],
      [{ day: 'monday', start_time: '14:30', end_time: '16:00' }, { day: 'thursday', start_time: '14:30', end_time: '16:00' }],

      // Salı-Perşembe saatleri
      [{ day: 'tuesday', start_time: '09:00', end_time: '10:30' }, { day: 'thursday', start_time: '09:00', end_time: '10:30' }],
      [{ day: 'tuesday', start_time: '11:00', end_time: '12:30' }, { day: 'thursday', start_time: '11:00', end_time: '12:30' }],
      [{ day: 'tuesday', start_time: '13:00', end_time: '14:30' }, { day: 'thursday', start_time: '13:00', end_time: '14:30' }],
      [{ day: 'tuesday', start_time: '14:30', end_time: '16:00' }, { day: 'thursday', start_time: '14:30', end_time: '16:00' }],

      // Çarşamba-Cuma saatleri
      [{ day: 'wednesday', start_time: '09:00', end_time: '10:30' }, { day: 'friday', start_time: '09:00', end_time: '10:30' }],
      [{ day: 'wednesday', start_time: '11:00', end_time: '12:30' }, { day: 'friday', start_time: '11:00', end_time: '12:30' }],
      [{ day: 'wednesday', start_time: '13:00', end_time: '14:30' }, { day: 'friday', start_time: '13:00', end_time: '14:30' }],
      [{ day: 'wednesday', start_time: '14:30', end_time: '16:00' }, { day: 'friday', start_time: '14:30', end_time: '16:00' }],

      // Perşembe-Cuma saatleri
      [{ day: 'thursday', start_time: '09:00', end_time: '10:30' }, { day: 'friday', start_time: '09:00', end_time: '10:30' }],
      [{ day: 'thursday', start_time: '11:00', end_time: '12:30' }, { day: 'friday', start_time: '11:00', end_time: '12:30' }],
      [{ day: 'thursday', start_time: '13:00', end_time: '14:30' }, { day: 'friday', start_time: '13:00', end_time: '14:30' }],
      [{ day: 'thursday', start_time: '14:30', end_time: '16:00' }, { day: 'friday', start_time: '14:30', end_time: '16:00' }],

      // Tek gün dersler (daha fazla seçenek için)
      [{ day: 'monday', start_time: '16:00', end_time: '17:30' }],
      [{ day: 'tuesday', start_time: '16:00', end_time: '17:30' }],
      [{ day: 'wednesday', start_time: '16:00', end_time: '17:30' }],
      [{ day: 'thursday', start_time: '16:00', end_time: '17:30' }],
      [{ day: 'friday', start_time: '16:00', end_time: '17:30' }],
    ];

    let sectionCount = 0;
    let scheduleIndex = 0; // Her ders için sırayla farklı schedule atamak için

    // Get course data to determine department
    const allCourses = await Course.findAll({
      include: [{ model: Department, as: 'department' }],
    });
    const courseDataMap = {};
    allCourses.forEach((c) => {
      courseDataMap[c.code] = c;
    });

    for (const courseCode of Object.keys(courseMap)) {
      const courseId = courseMap[courseCode];
      const courseData = courseDataMap[courseCode];

      // Assign instructor based on course department
      let instructor = null;
      if (courseData?.department?.code && facultyByDept[courseData.department.code]) {
        instructor = facultyByDept[courseData.department.code];
      } else {
        // Fallback to random if no matching department
        instructor = facultyMembers[Math.floor(Math.random() * facultyMembers.length)];
      }

      const randomClassroom = allClassrooms[Math.floor(Math.random() * allClassrooms.length)];

      // Her ders için sırayla farklı schedule atama (çakışma önleme)
      const selectedSchedule = sectionSchedules[scheduleIndex % sectionSchedules.length];
      scheduleIndex++;

      await CourseSection.findOrCreate({
        where: {
          course_id: courseId,
          section_number: 1,
          semester: currentSemester,
          year: currentYear,
        },
        defaults: {
          course_id: courseId,
          section_number: 1,
          semester: currentSemester,
          year: currentYear,
          instructor_id: instructor?.id || null,
          classroom_id: randomClassroom?.id || null,
          capacity: 40,
          enrolled_count: 0,
          schedule_json: selectedSchedule,
          is_active: true,
        },
      });
      sectionCount++;
    }
    console.log(`✅ ${sectionCount} section oluşturuldu\n`);

    // Get students
    const students = await Student.findAll({
      include: [{ model: User, as: 'user' }],
    });

    // Create sample enrollments
    if (students.length > 0) {
      console.log('📝 Örnek kayıtlar oluşturuluyor...');
      const sections = await CourseSection.findAll({
        where: { semester: currentSemester, year: currentYear },
        include: [{ model: Course, as: 'course' }],
      });

      // Enroll first student in some courses
      const firstStudent = students[0];
      const sampleSections = sections.slice(0, Math.min(5, sections.length));

      for (const section of sampleSections) {
        const [enrollment, created] = await Enrollment.findOrCreate({
          where: {
            student_id: firstStudent.id,
            section_id: section.id,
          },
          defaults: {
            student_id: firstStudent.id,
            section_id: section.id,
            status: 'enrolled',
            enrollment_date: new Date(),
          },
        });

        if (created) {
          // Update enrolled count
          await section.update({
            enrolled_count: section.enrolled_count + 1,
          });
        }
      }
      console.log(`✅ ${sampleSections.length} örnek kayıt oluşturuldu\n`);
    }

    console.log('🎉 Part 2 Seed tamamlandı!\n');
    console.log('Özet:');
    console.log(`  - ${classrooms.length} Derslik`);
    console.log(`  - ${courses.length} Ders`);
    console.log(`  - ${prereqCount} Önkoşul`);
    console.log(`  - ${sectionCount} Section`);
    console.log(`  - ${currentSemester} ${currentYear} Dönemi\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed hatası:', error);
    process.exit(1);
  }
}

seed();

