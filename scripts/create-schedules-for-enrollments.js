/**
 * Create schedules for all existing enrolled students
 * This script processes all enrolled enrollments and creates schedule entries
 * from their section's schedule_json data
 * 
 * Usage: node scripts/create-schedules-for-enrollments.js
 */

require('dotenv').config();
const db = require('../src/models');
const enrollmentService = require('../src/services/enrollmentService');
const logger = require('../src/utils/logger');
const { Op } = require('sequelize');

async function createSchedulesForEnrollments() {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Database connection established.\n');

    console.log('🔍 Finding all enrolled enrollments...\n');

    // Get all enrolled enrollments
    const enrollments = await db.Enrollment.findAll({
      where: {
        status: { [Op.in]: ['enrolled', 'completed'] },
      },
      include: [
        {
          model: db.CourseSection,
          as: 'section',
          include: [
            { model: db.Course, as: 'course', attributes: ['code', 'name'] },
          ],
        },
        {
          model: db.Student,
          as: 'student',
          include: [
            { model: db.User, as: 'user', attributes: ['first_name', 'last_name'] },
          ],
        },
      ],
      order: [['created_at', 'ASC']],
    });

    console.log(`📊 Found ${enrollments.length} enrolled enrollments\n`);

    if (enrollments.length === 0) {
      console.log('ℹ️  No enrolled enrollments found. Nothing to process.\n');
      await db.sequelize.close();
      process.exit(0);
    }

    // Group enrollments by section_id to avoid duplicate schedule creation
    const sectionMap = new Map();
    for (const enrollment of enrollments) {
      const sectionId = enrollment.section_id;
      if (!sectionMap.has(sectionId)) {
        sectionMap.set(sectionId, {
          section: enrollment.section,
          enrollments: [],
        });
      }
      sectionMap.get(sectionId).enrollments.push(enrollment);
    }

    console.log(`📚 Found ${sectionMap.size} unique sections\n`);
    console.log('🔄 Processing sections and creating schedules...\n');

    let processedCount = 0;
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each unique section
    for (const [sectionId, data] of sectionMap.entries()) {
      const { section, enrollments: sectionEnrollments } = data;
      
      try {
        processedCount++;
        const courseCode = section.course?.code || 'N/A';
        const courseName = section.course?.name || 'N/A';
        
        console.log(`[${processedCount}/${sectionMap.size}] Processing section: ${courseCode} - ${courseName} (${sectionEnrollments.length} students)`);

        // Check if schedule already exists
        const existingSchedules = await db.Schedule.count({
          where: { section_id: sectionId },
        });

        if (existingSchedules > 0) {
          console.log(`   ⏭️  Schedule already exists (${existingSchedules} entries), skipping...\n`);
          skippedCount++;
          continue;
        }

        // Check if section has schedule_json
        if (!section.schedule_json) {
          console.log(`   ⚠️  Section has no schedule_json, skipping...\n`);
          skippedCount++;
          continue;
        }

        // Create schedule using enrollmentService method
        await enrollmentService.createScheduleFromSection(sectionId);

        // Verify schedule was created
        const newSchedules = await db.Schedule.count({
          where: { section_id: sectionId },
        });

        if (newSchedules > 0) {
          console.log(`   ✅ Created ${newSchedules} schedule entries\n`);
          createdCount++;
        } else {
          console.log(`   ⚠️  No schedule entries created (may be due to empty schedule_json)\n`);
          skippedCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`   ❌ Error processing section ${sectionId}:`, error.message);
        logger.error(`Error creating schedule for section ${sectionId}:`, error);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total sections processed: ${processedCount}`);
    console.log(`Schedules created: ${createdCount}`);
    console.log(`Sections skipped: ${skippedCount} (already have schedules or no schedule_json)`);
    console.log(`Errors: ${errorCount}`);
    console.log('='.repeat(60) + '\n');

    if (errorCount > 0) {
      console.log('⚠️  Some sections had errors. Check the logs above for details.\n');
    } else {
      console.log('✅ All sections processed successfully!\n');
    }

    await db.sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    logger.error('Fatal error in create-schedules-for-enrollments script:', error);
    await db.sequelize.close();
    process.exit(1);
  }
}

createSchedulesForEnrollments();

