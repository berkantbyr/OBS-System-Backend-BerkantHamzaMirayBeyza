/**
 * Production Veritabanı Seeder Script
 * 
 * Bu script production veritabanına bölüm ve ders verilerini ekler.
 * 
 * Kullanım:
 * 1. Production .env dosyasını oluşturun veya environment variable'ları ayarlayın
 * 2. node scripts/seed-production.js
 * 
 * VEYA Cloud Run'da çalıştırmak için:
 * gcloud run jobs create seed-database \
 *   --image gcr.io/PROJECT_ID/obs-api:latest \
 *   --region europe-west1 \
 *   --set-env-vars "NODE_ENV=production" \
 *   --command "node" \
 *   --args "scripts/seed-production.js"
 */

require('dotenv').config();
const path = require('path');

// seedPart2Data.js'yi direkt çalıştır
// Bu script sadece seedPart2Data.js'yi production environment'ta çalıştırmak için bir wrapper
async function seedProduction() {
  try {
    console.log('🌱 Production veritabanı seed işlemi başlatılıyor...\n');
    console.log('📝 Environment:', process.env.NODE_ENV || 'development');
    console.log('🗄️  Database:', process.env.DB_NAME || 'campus_db');
    console.log('🌐 Host:', process.env.DB_HOST || 'localhost');
    console.log('');
    
    // seedPart2Data.js'yi direkt require et ve çalıştır
    // seedPart2Data.js zaten kendi içinde process.exit() çağırıyor
    require('../src/seeders/seedPart2Data');
    
  } catch (error) {
    console.error('❌ Production seed hatası:', error);
    process.exit(1);
  }
}

// Eğer direkt çalıştırılıyorsa
if (require.main === module) {
  seedProduction()
    .then(() => {
      console.log('\n🎉 İşlem başarıyla tamamlandı!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ İşlem başarısız:', error);
      process.exit(1);
    });
}

module.exports = seedProduction;

