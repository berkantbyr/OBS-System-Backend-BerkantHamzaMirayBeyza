/**
 * Add Missing Departments Script
 * Adds departments to the database without resetting existing data
 * 
 * Usage: node scripts/add-departments.js
 */

require('dotenv').config();
const db = require('../src/models');
const { Department } = db;

const departments = [
  // Mühendislik Fakültesi
  { code: 'CSE', name: 'Bilgisayar Mühendisliği', faculty: 'Mühendislik Fakültesi', is_active: true },
  { code: 'EE', name: 'Elektrik-Elektronik Mühendisliği', faculty: 'Mühendislik Fakültesi', is_active: true },
  { code: 'ME', name: 'Makine Mühendisliği', faculty: 'Mühendislik Fakültesi', is_active: true },
  { code: 'CE', name: 'İnşaat Mühendisliği', faculty: 'Mühendislik Fakültesi', is_active: true },
  { code: 'IE', name: 'Endüstri Mühendisliği', faculty: 'Mühendislik Fakültesi', is_active: true },
  { code: 'CHE', name: 'Kimya Mühendisliği', faculty: 'Mühendislik Fakültesi', is_active: true },
  // Fen Fakültesi
  { code: 'MATH', name: 'Matematik', faculty: 'Fen Fakültesi', is_active: true },
  { code: 'PHYS', name: 'Fizik', faculty: 'Fen Fakültesi', is_active: true },
  { code: 'CHEM', name: 'Kimya', faculty: 'Fen Fakültesi', is_active: true },
  { code: 'BIO', name: 'Biyoloji', faculty: 'Fen Fakültesi', is_active: true },
  { code: 'STAT', name: 'İstatistik', faculty: 'Fen Fakültesi', is_active: true },
  // İşletme Fakültesi
  { code: 'BA', name: 'İşletme', faculty: 'İşletme Fakültesi', is_active: true },
  { code: 'ECON', name: 'Ekonomi', faculty: 'İşletme Fakültesi', is_active: true },
  { code: 'FIN', name: 'Finans', faculty: 'İşletme Fakültesi', is_active: true },
  { code: 'MIS', name: 'Yönetim Bilişim Sistemleri', faculty: 'İşletme Fakültesi', is_active: true },
  // Hukuk Fakültesi
  { code: 'LAW', name: 'Hukuk', faculty: 'Hukuk Fakültesi', is_active: true },
  // Tıp Fakültesi
  { code: 'MED', name: 'Tıp', faculty: 'Tıp Fakültesi', is_active: true },
  // Edebiyat Fakültesi
  { code: 'PSY', name: 'Psikoloji', faculty: 'Edebiyat Fakültesi', is_active: true },
  { code: 'SOC', name: 'Sosyoloji', faculty: 'Edebiyat Fakültesi', is_active: true },
  { code: 'HIST', name: 'Tarih', faculty: 'Edebiyat Fakültesi', is_active: true },
  { code: 'ENG', name: 'İngiliz Dili ve Edebiyatı', faculty: 'Edebiyat Fakültesi', is_active: true },
  { code: 'TUR', name: 'Türk Dili ve Edebiyatı', faculty: 'Edebiyat Fakültesi', is_active: true },
  // Mimarlık Fakültesi
  { code: 'ARCH', name: 'Mimarlık', faculty: 'Mimarlık Fakültesi', is_active: true },
  { code: 'ID', name: 'İç Mimarlık', faculty: 'Mimarlık Fakültesi', is_active: true },
  // İletişim Fakültesi
  { code: 'COMM', name: 'İletişim', faculty: 'İletişim Fakültesi', is_active: true },
  { code: 'PR', name: 'Halkla İlişkiler', faculty: 'İletişim Fakültesi', is_active: true },
];

async function addDepartments() {
  try {
    console.log('🏢 Bölümler ekleniyor...\n');

    let addedCount = 0;
    let updatedCount = 0;
    let existingCount = 0;

    for (const dept of departments) {
      const [department, created] = await Department.findOrCreate({
        where: { code: dept.code },
        defaults: dept,
      });

      if (created) {
        console.log(`  ✅ Eklendi: ${dept.name} (${dept.code})`);
        addedCount++;
      } else {
        // Update is_active to true if it was false
        if (!department.is_active) {
          await department.update({ is_active: true });
          console.log(`  🔄 Aktif edildi: ${dept.name} (${dept.code})`);
          updatedCount++;
        } else {
          existingCount++;
        }
      }
    }

    console.log('\n📊 Özet:');
    console.log(`  - Yeni eklenen: ${addedCount}`);
    console.log(`  - Aktif edilen: ${updatedCount}`);
    console.log(`  - Zaten mevcut: ${existingCount}`);
    console.log(`  - Toplam: ${departments.length} bölüm\n`);

    // Show all active departments
    const activeDepts = await Department.findAll({
      where: { is_active: true },
      order: [['faculty', 'ASC'], ['name', 'ASC']],
    });

    console.log('📋 Aktif Bölümler:');
    let currentFaculty = '';
    for (const dept of activeDepts) {
      if (dept.faculty !== currentFaculty) {
        currentFaculty = dept.faculty;
        console.log(`\n  ${currentFaculty}:`);
      }
      console.log(`    - ${dept.name} (${dept.code})`);
    }

    console.log('\n✅ İşlem tamamlandı!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Hata:', error.message);
    process.exit(1);
  }
}

addDepartments();




