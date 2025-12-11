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
    prerequisites: ['CSE101'],
  },
  {
    code: 'CSE201',
    name: 'Veri Yapıları',
    description: 'Temel veri yapıları ve algoritmalar. Diziler, bağlı listeler, yığınlar, kuyruklar, ağaçlar ve graflar.',
    credits: 4,
    ects: 7,
    department_code: 'CSE',
    prerequisites: ['CSE102'],
  },
  {
    code: 'CSE202',
    name: 'Veritabanı Yönetimi',
    description: 'İlişkisel veritabanları, SQL, normalizasyon ve veritabanı tasarımı.',
    credits: 3,
    ects: 5,
    department_code: 'CSE',
    prerequisites: ['CSE101'],
  },
  {
    code: 'CSE301',
    name: 'Yazılım Mühendisliği',
    description: 'Yazılım geliştirme süreçleri, çevik metodolojiler, test ve kalite güvence.',
    credits: 3,
    ects: 5,
    department_code: 'CSE',
    prerequisites: ['CSE201'],
  },
  {
    code: 'CSE302',
    name: 'Web Programlama',
    description: 'Modern web teknolojileri: HTML5, CSS3, JavaScript, React, Node.js.',
    credits: 3,
    ects: 5,
    department_code: 'CSE',
    prerequisites: ['CSE201'],
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
    prerequisites: ['MATH101'],
  },
  {
    code: 'MATH201',
    name: 'Lineer Cebir',
    description: 'Matrisler, vektör uzayları, lineer dönüşümler.',
    credits: 3,
    ects: 5,
    department_code: 'MATH',
    prerequisites: ['MATH102'],
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
    prerequisites: ['PHYS101'],
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
    prerequisites: ['BUS101'],
  },
];

async function seed() {
  try {
    console.log('🌱 Part 2 Seed başlatılıyor...\n');

    // Sync database
    await db.sequelize.sync({ alter: true });
    console.log('✅ Veritabanı senkronize edildi\n');

    // Get existing departments
    const departments = await Department.findAll();
    if (departments.length === 0) {
      console.log('⚠️ Bölümler bulunamadı. Önce Part 1 seed çalıştırılmalı.');
      
      // Create basic departments
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

    const sectionSchedules = [
      [{ day: 'monday', start_time: '09:00', end_time: '10:30' }, { day: 'wednesday', start_time: '09:00', end_time: '10:30' }],
      [{ day: 'monday', start_time: '11:00', end_time: '12:30' }, { day: 'thursday', start_time: '11:00', end_time: '12:30' }],
      [{ day: 'tuesday', start_time: '09:00', end_time: '10:30' }, { day: 'friday', start_time: '09:00', end_time: '10:30' }],
      [{ day: 'tuesday', start_time: '14:00', end_time: '15:30' }, { day: 'thursday', start_time: '14:00', end_time: '15:30' }],
      [{ day: 'wednesday', start_time: '13:00', end_time: '14:30' }, { day: 'friday', start_time: '13:00', end_time: '14:30' }],
    ];

    let sectionCount = 0;
    for (const courseCode of Object.keys(courseMap)) {
      const courseId = courseMap[courseCode];
      const randomInstructor = facultyMembers[Math.floor(Math.random() * facultyMembers.length)];
      const randomClassroom = allClassrooms[Math.floor(Math.random() * allClassrooms.length)];
      const randomSchedule = sectionSchedules[Math.floor(Math.random() * sectionSchedules.length)];

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
          instructor_id: randomInstructor?.id || null,
          classroom_id: randomClassroom?.id || null,
          capacity: 40,
          enrolled_count: 0,
          schedule_json: randomSchedule,
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

