const db = require('../models');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const { User, Student, Faculty, Department, Course, CourseSection, Enrollment, Announcement, AttendanceSession } = db;

/**
 * Get dashboard stats based on user role
 * GET /api/v1/dashboard/stats
 */
const getDashboardStats = async (req, res) => {
    try {
        const { user } = req;
        let stats = {};

        logger.info(`📊 Getting dashboard stats for user: ${user.id}, role: ${user.role}`);

        if (user.role === 'student') {
            // Get student's enrolled courses count
            const student = await Student.findOne({ where: { user_id: user.id } });

            if (student) {
                logger.info(`✅ Student found: ${student.id}`);

                // Active enrollments count
                const activeEnrollments = await Enrollment.count({
                    where: {
                        student_id: student.id,
                        status: 'enrolled'
                    }
                });

                // Get today's courses
                const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                const enrolledSections = await Enrollment.findAll({
                    where: { student_id: student.id, status: 'enrolled' },
                    include: [{
                        model: CourseSection,
                        as: 'section',
                        attributes: ['schedule_json'],
                        required: false
                    }]
                });

                let todayCoursesCount = 0;
                enrolledSections.forEach(enrollment => {
                    if (enrollment.section?.schedule_json) {
                        try {
                            const schedule = typeof enrollment.section.schedule_json === 'string'
                                ? JSON.parse(enrollment.section.schedule_json)
                                : enrollment.section.schedule_json;
                            if (Array.isArray(schedule)) {
                                schedule.forEach(s => {
                                    if (s.day?.toLowerCase() === today.toLowerCase()) {
                                        todayCoursesCount++;
                                    }
                                });
                            }
                        } catch (e) { /* ignore parse errors */ }
                    }
                });

                // Get GPA from student record
                const gpa = student.cgpa || 0;

                // Get unread announcements count
                let announcementsCount = 0;
                try {
                    announcementsCount = await Announcement.count({
                        where: {
                            is_active: true,
                            [Op.or]: [
                                { target_audience: 'all' },
                                { target_audience: 'students' }
                            ]
                        }
                    });
                } catch (announcementError) {
                    logger.warn('Could not fetch announcements count:', announcementError.message);
                }

                stats = {
                    activeCourses: activeEnrollments || 0,
                    todayCourses: todayCoursesCount || 0,
                    gpa: parseFloat(gpa || 0).toFixed(2),
                    notifications: announcementsCount || 0
                };

                logger.info(`✅ Student stats calculated:`, stats);
            } else {
                logger.warn(`⚠️ Student record not found for user: ${user.id}`);
                stats = {
                    activeCourses: 0,
                    todayCourses: 0,
                    gpa: '0.00',
                    notifications: 0
                };
            }
        } else if (user.role === 'faculty') {
            const faculty = await Faculty.findOne({ where: { user_id: user.id } });

            if (faculty) {
                logger.info(`✅ Faculty found: ${faculty.id}`);

                // Get sections taught by this faculty
                const sections = await CourseSection.findAll({
                    where: { instructor_id: faculty.id, is_active: true },
                    include: [{
                        model: Course,
                        as: 'course',
                        attributes: ['code', 'name'],
                        required: false
                    }]
                });

                // Count total students
                let totalStudents = 0;
                for (const section of sections) {
                    const count = await Enrollment.count({
                        where: { section_id: section.id, status: 'enrolled' }
                    });
                    totalStudents += count;
                }

                // Today's courses
                const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                let todayCoursesCount = 0;
                sections.forEach(section => {
                    if (section.schedule_json) {
                        try {
                            const schedule = typeof section.schedule_json === 'string'
                                ? JSON.parse(section.schedule_json)
                                : section.schedule_json;
                            if (Array.isArray(schedule)) {
                                schedule.forEach(s => {
                                    if (s.day?.toLowerCase() === today.toLowerCase()) {
                                        todayCoursesCount++;
                                    }
                                });
                            }
                        } catch (e) { /* ignore parse errors */ }
                    }
                });

                // Pending attendance sessions
                let pendingSessions = 0;
                try {
                    pendingSessions = await AttendanceSession.count({
                        where: {
                            instructor_id: faculty.id,
                            status: 'active'
                        }
                    });
                } catch (sessionError) {
                    logger.warn('Could not fetch attendance sessions count:', sessionError.message);
                }

                stats = {
                    teachingCourses: sections.length || 0,
                    totalStudents: totalStudents || 0,
                    todayCourses: todayCoursesCount || 0,
                    activeSessions: pendingSessions || 0
                };

                logger.info(`✅ Faculty stats calculated:`, stats);
            } else {
                logger.warn(`⚠️ Faculty record not found for user: ${user.id}`);
                stats = {
                    teachingCourses: 0,
                    totalStudents: 0,
                    todayCourses: 0,
                    activeSessions: 0
                };
            }
        } else if (user.role === 'admin') {
            // Total users
            const totalUsers = await User.count();

            // Active students
            const activeStudents = await User.count({
                where: { role: 'student', is_active: true }
            });

            // Faculty count
            const facultyCount = await User.count({
                where: { role: 'faculty' }
            });

            // Departments count
            const departmentsCount = await Department.count();

            stats = {
                totalUsers: totalUsers || 0,
                activeStudents: activeStudents || 0,
                facultyCount: facultyCount || 0,
                departmentsCount: departmentsCount || 0
            };

            logger.info(`✅ Admin stats calculated:`, stats);
        }

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('❌ Get dashboard stats error:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
        res.status(500).json({
            success: false,
            message: 'İstatistikler yüklenirken hata oluştu',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            code: 'SERVER_ERROR'
        });
    }
};

/**
 * Get recent activities for dashboard
 * GET /api/v1/dashboard/activities
 */
const getRecentActivities = async (req, res) => {
    try {
        const { user } = req;
        const activities = [];

        logger.info(`📋 Getting recent activities for user: ${user.id}, role: ${user.role}`);

        // Get recent announcements (for all users)
        try {
            const whereClause = {
                is_active: true
            };

            if (user.role === 'student') {
                whereClause[Op.or] = [
                    { target_audience: 'all' },
                    { target_audience: 'students' }
                ];
            } else if (user.role === 'faculty') {
                whereClause[Op.or] = [
                    { target_audience: 'all' },
                    { target_audience: 'faculty' }
                ];
            }

            const announcements = await Announcement.findAll({
                where: whereClause,
                order: [['created_at', 'DESC']],
                limit: 5,
                attributes: ['id', 'title', 'created_at']
            });

            announcements.forEach(a => {
                activities.push({
                    id: `announcement-${a.id}`,
                    text: `Duyuru: ${a.title || 'Başlıksız'}`,
                    time: a.created_at,
                    type: 'info'
                });
            });

            logger.info(`✅ Found ${announcements.length} announcements`);
        } catch (announcementError) {
            logger.warn('Could not fetch announcements:', announcementError.message);
        }

        // For students - get recent grade updates
        if (user.role === 'student') {
            try {
                const student = await Student.findOne({ where: { user_id: user.id } });
                if (student) {
                    const recentEnrollments = await Enrollment.findAll({
                        where: {
                            student_id: student.id,
                            letter_grade: { [Op.ne]: null }
                        },
                        order: [['updated_at', 'DESC']],
                        limit: 3,
                        include: [{
                            model: CourseSection,
                            as: 'section',
                            required: false,
                            include: [{
                                model: Course,
                                as: 'course',
                                attributes: ['code', 'name'],
                                required: false
                            }]
                        }]
                    });

                    recentEnrollments.forEach(e => {
                        if (e.section?.course) {
                            activities.push({
                                id: `grade-${e.id}`,
                                text: `${e.section.course.code || 'Ders'} dersi için not girildi`,
                                time: e.updated_at,
                                type: 'success'
                            });
                        }
                    });

                    logger.info(`✅ Found ${recentEnrollments.length} grade updates for student`);
                }
            } catch (gradeError) {
                logger.warn('Could not fetch grade updates:', gradeError.message);
            }
        }

        // For faculty - get recent attendance sessions
        if (user.role === 'faculty') {
            try {
                const faculty = await Faculty.findOne({ where: { user_id: user.id } });
                if (faculty) {
                    const recentSessions = await AttendanceSession.findAll({
                        where: { instructor_id: faculty.id },
                        order: [['created_at', 'DESC']],
                        limit: 3,
                        include: [{
                            model: CourseSection,
                            as: 'section',
                            required: false,
                            include: [{
                                model: Course,
                                as: 'course',
                                attributes: ['code', 'name'],
                                required: false
                            }]
                        }]
                    });

                    recentSessions.forEach(s => {
                        if (s.section?.course) {
                            activities.push({
                                id: `session-${s.id}`,
                                text: `${s.section.course.code || 'Ders'} dersi için yoklama ${s.status === 'completed' ? 'tamamlandı' : 'başlatıldı'}`,
                                time: s.created_at,
                                type: s.status === 'completed' ? 'success' : 'warning'
                            });
                        }
                    });

                    logger.info(`✅ Found ${recentSessions.length} attendance sessions for faculty`);
                }
            } catch (sessionError) {
                logger.warn('Could not fetch attendance sessions:', sessionError.message);
            }
        }

        // Sort by time descending
        activities.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));

        // Format times to relative
        const now = new Date();
        const formattedActivities = activities.slice(0, 5).map(activity => {
            const activityTime = new Date(activity.time || now);
            const diffMs = now - activityTime;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            let timeText;
            if (diffMins < 1) {
                timeText = 'Az önce';
            } else if (diffMins < 60) {
                timeText = `${diffMins} dakika önce`;
            } else if (diffHours < 24) {
                timeText = `${diffHours} saat önce`;
            } else {
                timeText = `${diffDays} gün önce`;
            }

            return {
                ...activity,
                time: timeText
            };
        });

        logger.info(`✅ Returning ${formattedActivities.length} activities`);

        res.status(200).json({
            success: true,
            data: formattedActivities
        });
    } catch (error) {
        logger.error('❌ Get recent activities error:', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
        res.status(500).json({
            success: false,
            message: 'Aktiviteler yüklenirken hata oluştu',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            code: 'SERVER_ERROR'
        });
    }
};

module.exports = {
    getDashboardStats,
    getRecentActivities
};
