/**
 * Create sample menus for the next 30 days
 * Usage: node scripts/create-sample-menus.js
 */

require('dotenv').config();
const db = require('../src/models');

const { Cafeteria, MealMenu } = db;

const mealItems = {
    breakfast: [
        'Kahvaltı Tabağı (Peynir, zeytin, domates, salatalık, yumurta, bal, tereyağı)',
        'Menemen (Taze domatesli menemen, ekmek ile)',
        'Simit & Çay'
    ],
    lunch: [
        'Tavuk Şiş (Marine edilmiş tavuk şiş, pilav ve salata ile)',
        'Köfte (Izgara köfte, patates kızartması ve salata ile)',
        'Mercimek Çorbası (Günün çorbası)'
    ],
    dinner: [
        'Izgara Somon (Tereyağlı patates püresi ile)',
        'Döner (Tavuk veya et döner, lavaş ve garnitür ile)',
        'Kebap Tabağı (Karışık kebap, bulgur pilavı ve salata)'
    ],
};

async function createSampleMenus() {
    try {
        await db.sequelize.authenticate();
        console.log('✅ Database connection established.\n');

        // Get all cafeterias
        const cafeterias = await Cafeteria.findAll({ where: { is_active: true } });
        
        if (cafeterias.length === 0) {
            console.log('❌ No cafeterias found. Please create cafeterias first.');
            process.exit(1);
        }

        console.log(`📋 Found ${cafeterias.length} cafeterias\n`);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let menuCount = 0;
        const daysToCreate = 30; // Create menus for next 30 days

        for (const cafeteria of cafeterias) {
            for (let day = 0; day < daysToCreate; day++) {
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
                            is_published: true, // IMPORTANT: Published so all users can see
                            meal_time: mealType === 'breakfast' ? '08:00' : mealType === 'lunch' ? '12:00' : '18:00',
                        },
                    });
                    
                    // If menu exists but not published, update it
                    if (!created && !menu.is_published) {
                        await menu.update({ is_published: true });
                        console.log(`✅ Updated menu: ${cafeteria.name} - ${dateStr} - ${mealType}`);
                    }
                    
                    if (created) {
                        menuCount++;
                    }
                }
            }
        }

        console.log(`\n✅ ${menuCount} new menus created`);
        console.log(`📅 Menus created for the next ${daysToCreate} days`);
        console.log(`\n💡 Menus are published and visible to all users!\n`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await db.sequelize.close();
    }
}

createSampleMenus();

