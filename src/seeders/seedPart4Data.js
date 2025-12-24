/**
 * Part 4 Complete Seed Data
 * Seeds cafeterias, menus, events, announcements, wallets, sample sensors
 * 
 * Usage: node src/seeders/seedPart4Data.js
 */

require('dotenv').config();
const db = require('../models');

const {
    User,
    Student,
    Department,
    Cafeteria,
    MealMenu,
    Wallet,
    Event,
    Announcement,
    AcademicCalendar,
    Sensor,
    Notification,
} = db;

// Cafeteria data
const cafeterias = [
    {
        name: 'Merkez Yemekhane',
        location: 'Ana Kampüs - A Binası',
        capacity: 500,
        is_active: true,
    },
    {
        name: 'Mühendislik Kafeterya',
        location: 'Mühendislik Fakültesi - Zemin Kat',
        capacity: 200,
        is_active: true,
    },
    {
        name: 'Öğrenci Kantini',
        location: 'Öğrenci Merkezi - 1. Kat',
        capacity: 150,
        is_active: true,
    },
];

// Events
const events = [
    {
        title: 'Kariyer Günleri 2024',
        description: 'Türkiye\'nin önde gelen teknoloji şirketleri ile buluşma fırsatı. CV hazırlama atölyeleri ve mülakat simülasyonları.',
        category: 'career',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        start_time: '10:00',
        end_time: '17:00',
        location: 'Kongre Merkezi',
        capacity: 500,
        status: 'published',
    },
    {
        title: 'Yapay Zeka ve Gelecek Konferansı',
        description: 'Dünyaca ünlü akademisyenler ve sektör liderlerinin katılımıyla AI konferansı.',
        category: 'academic',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        start_time: '09:00',
        end_time: '18:00',
        location: 'Büyük Amfi',
        capacity: 300,
        status: 'published',
    },
    {
        title: 'Bahar Şenliği',
        description: 'Konserler, yemek stantları, yarışmalar ve çok daha fazlası!',
        category: 'social',
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        start_time: '12:00',
        end_time: '23:00',
        location: 'Kampüs Bahçesi',
        capacity: 2000,
        status: 'published',
    },
    {
        title: 'Hackathon 2024',
        description: '48 saatlik yazılım geliştirme maratonu. Takım halinde veya bireysel katılım.',
        category: 'academic',
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        start_time: '18:00',
        end_time: '18:00',
        location: 'Bilgisayar Mühendisliği Binası',
        capacity: 100,
        is_paid: true,
        price: 50.00,
        status: 'published',
    },
    {
        title: 'Spor Turnuvası',
        description: 'Fakülteler arası futbol, basketbol ve voleybol turnuvası.',
        category: 'sports',
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        start_time: '09:00',
        end_time: '18:00',
        location: 'Spor Kompleksi',
        capacity: 500,
        status: 'published',
    },
    {
        title: 'Yazar Söyleşisi',
        description: 'Edebiyat söyleşisi - Konuk yazar ile buluşma.',
        category: 'cultural',
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        start_time: '14:00',
        end_time: '16:00',
        location: 'Kütüphane Konferans Salonu',
        capacity: 200,
        status: 'published',
    },
];

// Announcements
const announcements = [
    {
        title: 'Final Sınavları Programı Açıklandı',
        content: '2024-2025 Güz dönemi final sınavları programı yayınlandı. Öğrenci İşleri web sayfasından kontrol edebilirsiniz. Sınavlar 6 Ocak 2025 tarihinde başlayacaktır.',
        type: 'info',
        target_audience: 'all',
        is_active: true,
        priority: 2,
    },
    {
        title: 'Kütüphane Çalışma Saatleri Güncellendi',
        content: 'Final dönemi boyunca kütüphane 7/24 açık olacaktır. Sessiz çalışma odaları için önceden rezervasyon yapılması gerekmektedir.',
        type: 'info',
        target_audience: 'students',
        is_active: true,
        priority: 1,
    },
    {
        title: 'Burs Başvuruları Başladı',
        content: '2025 Bahar dönemi için burs başvuruları açılmıştır. Son başvuru tarihi: 15 Ocak 2025. Detaylı bilgi için Öğrenci İşleri\'ne başvurunuz.',
        type: 'urgent',
        target_audience: 'students',
        is_active: true,
        priority: 3,
    },
    {
        title: 'Yeni Otopark Alanı Hizmete Açıldı',
        content: 'B Blok arkasındaki yeni otopark alanı hizmete açılmıştır. Toplam 200 araç kapasiteli alan, öğrenci ve personel kullanımına açıktır.',
        type: 'info',
        target_audience: 'all',
        is_active: true,
        priority: 0,
    },
    {
        title: 'Sağlık Merkezi Duyurusu',
        content: 'Sağlık Merkezi\'nde ücretsiz checkup yapılmaktadır. Randevu için sağlık merkezi web sitesini ziyaret ediniz.',
        type: 'info',
        target_audience: 'all',
        is_active: true,
        priority: 1,
    },
];

// Academic Calendar
const academicCalendarEvents = [
    {
        title: 'Final Sınavları Başlangıcı',
        description: '2024-2025 Güz dönemi final sınavları',
        event_type: 'final',
        start_date: new Date('2025-01-06'),
        end_date: new Date('2025-01-20'),
        is_active: true,
    },
    {
        title: 'Yarıyıl Tatili',
        description: 'Yarıyıl arası tatil dönemi',
        event_type: 'holiday',
        start_date: new Date('2025-01-21'),
        end_date: new Date('2025-02-10'),
        is_active: true,
    },
    {
        title: 'Bahar Dönemi Başlangıcı',
        description: '2024-2025 Bahar dönemi dersleri başlıyor',
        event_type: 'semester_start',
        start_date: new Date('2025-02-11'),
        end_date: new Date('2025-02-11'),
        is_active: true,
    },
    {
        title: 'Vize Sınavları',
        description: 'Bahar dönemi ara sınavları',
        event_type: 'midterm',
        start_date: new Date('2025-04-01'),
        end_date: new Date('2025-04-14'),
        is_active: true,
    },
];

// Sensors for IoT
const sensors = [
    {
        sensor_id: 'TEMP-A101',
        name: 'A101 Sıcaklık Sensörü',
        type: 'temperature',
        location: 'Mühendislik Fakültesi A101',
        building: 'Mühendislik Fakültesi',
        room: 'A101',
        unit: '°C',
        min_value: 15,
        max_value: 30,
        threshold_low: 18,
        threshold_high: 26,
        status: 'active',
    },
    {
        sensor_id: 'HUM-A101',
        name: 'A101 Nem Sensörü',
        type: 'humidity',
        location: 'Mühendislik Fakültesi A101',
        building: 'Mühendislik Fakültesi',
        room: 'A101',
        unit: '%',
        min_value: 20,
        max_value: 80,
        threshold_low: 30,
        threshold_high: 70,
        status: 'active',
    },
    {
        sensor_id: 'OCC-LIB',
        name: 'Kütüphane Doluluk Sensörü',
        type: 'occupancy',
        location: 'Merkez Kütüphane - Giriş',
        building: 'Merkez Kütüphane',
        room: 'Giriş',
        unit: 'kişi',
        min_value: 0,
        max_value: 500,
        threshold_high: 450,
        status: 'active',
    },
    {
        sensor_id: 'ENERGY-MAIN',
        name: 'Ana Bina Enerji Sayacı',
        type: 'energy',
        location: 'Ana Kampüs - Trafo',
        building: 'Ana Kampüs',
        unit: 'kWh',
        status: 'active',
    },
    {
        sensor_id: 'AIR-CAF',
        name: 'Yemekhane Hava Kalitesi',
        type: 'air_quality',
        location: 'Merkez Yemekhane',
        building: 'Merkez Yemekhane',
        unit: 'AQI',
        min_value: 0,
        max_value: 500,
        threshold_high: 100,
        status: 'active',
    },
    {
        sensor_id: 'LIGHT-A201',
        name: 'A201 Işık Sensörü',
        type: 'light',
        location: 'Mühendislik Fakültesi A201',
        building: 'Mühendislik Fakültesi',
        room: 'A201',
        unit: 'lux',
        min_value: 0,
        max_value: 1500,
        threshold_low: 300,
        status: 'active',
    },
];

async function seed() {
    try {
        console.log('🌱 Part 4 Seed başlatılıyor...\n');

        // Wait for database connection
        await db.sequelize.authenticate();
        console.log('✅ Veritabanı bağlantısı kuruldu\n');

        // Create cafeterias
        console.log('🍽️ Yemekhaneler oluşturuluyor...');
        const createdCafeterias = [];
        for (const cafeteria of cafeterias) {
            const [created] = await Cafeteria.findOrCreate({
                where: { name: cafeteria.name },
                defaults: cafeteria,
            });
            createdCafeterias.push(created);
        }
        console.log(`✅ ${cafeterias.length} yemekhane oluşturuldu\n`);

        // Create menus for each cafeteria using items_json
        console.log('📋 Menüler oluşturuluyor...');
        let menuCount = 0;
        const today = new Date();

        const mealItems = {
            breakfast: [
                { name: 'Kahvaltı Tabağı', description: 'Peynir, zeytin, domates, salatalık, yumurta, bal, tereyağı' },
                { name: 'Menemen', description: 'Taze domatesli menemen, ekmek ile' },
                { name: 'Simit & Çay', description: 'Crispy simit ve çay' },
            ],
            lunch: [
                { name: 'Tavuk Şiş', description: 'Marine edilmiş tavuk şiş, pilav ve salata ile' },
                { name: 'Köfte', description: 'Izgara köfte, patates kızartması ve salata ile' },
                { name: 'Mercimek Çorbası', description: 'Günün çorbası' },
            ],
            dinner: [
                { name: 'Izgara Somon', description: 'Tereyağlı patates püresi ile' },
                { name: 'Döner', description: 'Tavuk veya et döner, lavaş ve garnitür ile' },
                { name: 'Kebap Tabağı', description: 'Karışık kebap, bulgur pilavı ve salata' },
            ],
        };

        for (const cafeteria of createdCafeterias) {
            for (let day = 0; day < 7; day++) {
                const menuDate = new Date(today);
                menuDate.setDate(menuDate.getDate() + day);
                const dateStr = menuDate.toISOString().split('T')[0];

                for (const mealType of ['breakfast', 'lunch', 'dinner']) {
                    const [menu, created] = await MealMenu.findOrCreate({
                        where: {
                            cafeteria_id: cafeteria.id,
                            date: dateStr,
                            meal_type: mealType,
                        },
                        defaults: {
                            cafeteria_id: cafeteria.id,
                            date: dateStr,
                            meal_type: mealType,
                            items_json: mealItems[mealType],
                            price: mealType === 'breakfast' ? 25.00 : mealType === 'lunch' ? 35.00 : 40.00,
                            is_published: true,
                            meal_time: mealType === 'breakfast' ? '08:00' : mealType === 'lunch' ? '12:00' : '18:00',
                        },
                    });
                    if (created) menuCount++;
                }
            }
        }
        console.log(`✅ ${menuCount} menü oluşturuldu\n`);

        // Create events
        console.log('📅 Etkinlikler oluşturuluyor...');
        for (const event of events) {
            await Event.findOrCreate({
                where: { title: event.title },
                defaults: event,
            });
        }
        console.log(`✅ ${events.length} etkinlik oluşturuldu\n`);

        // Get admin user for announcements
        const adminUser = await User.findOne({ where: { role: 'admin' } });

        // Create announcements
        console.log('📢 Duyurular oluşturuluyor...');
        for (const announcement of announcements) {
            await Announcement.findOrCreate({
                where: { title: announcement.title },
                defaults: {
                    ...announcement,
                    author_id: adminUser?.id || null,
                },
            });
        }
        console.log(`✅ ${announcements.length} duyuru oluşturuldu\n`);

        // Create academic calendar events
        console.log('📆 Akademik takvim oluşturuluyor...');
        for (const event of academicCalendarEvents) {
            await AcademicCalendar.findOrCreate({
                where: { title: event.title, start_date: event.start_date },
                defaults: {
                    ...event,
                    semester: 'fall',
                    year: 2024,
                },
            });
        }
        console.log(`✅ ${academicCalendarEvents.length} akademik takvim etkinliği oluşturuldu\n`);

        // Create wallets for all users
        console.log('💳 Cüzdanlar oluşturuluyor...');
        const users = await User.findAll();
        let walletCount = 0;
        for (const user of users) {
            const [wallet, created] = await Wallet.findOrCreate({
                where: { user_id: user.id },
                defaults: {
                    user_id: user.id,
                    balance: user.role === 'student' ? 100.00 : 0.00,
                    currency: 'TRY',
                    is_active: true,
                },
            });
            if (created) walletCount++;
        }
        console.log(`✅ ${walletCount} cüzdan oluşturuldu\n`);

        // Create sensors
        console.log('📡 IoT Sensörleri oluşturuluyor...');
        for (const sensor of sensors) {
            await Sensor.findOrCreate({
                where: { sensor_id: sensor.sensor_id },
                defaults: {
                    ...sensor,
                    last_reading: sensor.type === 'temperature' ? 22.5 :
                        sensor.type === 'humidity' ? 45 :
                            sensor.type === 'occupancy' ? 150 :
                                sensor.type === 'energy' ? 1250 :
                                    sensor.type === 'air_quality' ? 35 : 500,
                    last_reading_at: new Date(),
                },
            });
        }
        console.log(`✅ ${sensors.length} sensör oluşturuldu\n`);

        // Create sample notifications for all users
        console.log('🔔 Bildirimler oluşturuluyor...');
        const allUsers = await User.findAll();
        let notificationCount = 0;

        const sampleNotifications = [
            {
                title: 'Hoş Geldiniz!',
                message: 'DKÜ Öğrenci Bilgi Sistemine hoş geldiniz. Tüm akademik işlemlerinizi buradan takip edebilirsiniz.',
                category: 'system',
                type: 'info',
            },
            {
                title: 'Ders Kaydı Hatırlatması',
                message: '2024-2025 Bahar dönemi ders kayıtları yaklaşıyor. Danışmanınızla görüşmeyi unutmayın.',
                category: 'academic',
                type: 'info',
            },
            {
                title: 'Yemek Rezervasyonu Onaylandı',
                message: 'Bugünkü öğle yemeği rezervasyonunuz onaylandı. QR kodunuz hazır.',
                category: 'meal',
                type: 'success',
            },
            {
                title: 'Yaklaşan Etkinlik: Kariyer Günleri',
                message: 'Kariyer Günleri 2024 etkinliği 1 hafta sonra başlayacak. Katılım için hemen kayıt olun!',
                category: 'event',
                type: 'info',
            },
            {
                title: 'Devamsızlık Uyarısı',
                message: 'CSE101 dersinde devamsızlık limitine yaklaşıyorsunuz. Dikkat ediniz.',
                category: 'attendance',
                type: 'warning',
            },
            {
                title: 'Cüzdan Bakiyesi',
                message: 'Cüzdanınıza 100 TL yüklendi. Mevcut bakiyeniz: 100 TL',
                category: 'payment',
                type: 'success',
            },
            {
                title: 'Vize Sınavları Başlıyor',
                message: 'Vize sınavları 2 hafta sonra başlayacak. Sınav programını kontrol etmeyi unutmayın.',
                category: 'academic',
                type: 'warning',
            },
            {
                title: 'Yeni Duyuru',
                message: 'Kütüphane çalışma saatleri güncellendi. Final dönemi boyunca 7/24 açık.',
                category: 'system',
                type: 'info',
            },
        ];

        for (const user of allUsers) {
            for (const notification of sampleNotifications) {
                await Notification.findOrCreate({
                    where: {
                        user_id: user.id,
                        title: notification.title
                    },
                    defaults: {
                        user_id: user.id,
                        ...notification,
                        read: false,
                    },
                });
                notificationCount++;
            }
        }
        console.log(`✅ ${notificationCount} bildirim oluşturuldu\n`);

        console.log('🎉 Part 4 Seed tamamlandı!\n');
        console.log('Özet:');
        console.log(`  - ${cafeterias.length} Yemekhane`);
        console.log(`  - ${menuCount} Menü`);
        console.log(`  - ${events.length} Etkinlik`);
        console.log(`  - ${announcements.length} Duyuru`);
        console.log(`  - ${academicCalendarEvents.length} Akademik Takvim`);
        console.log(`  - ${walletCount} Cüzdan`);
        console.log(`  - ${sensors.length} Sensör`);
        console.log(`  - ${notificationCount} Bildirim\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed hatası:', error);
        process.exit(1);
    }
}

seed();
