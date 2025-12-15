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

        if (user.role === 'student') {
            // Get student's enrolled courses count
            const student = await Student.findOne({ where: { user_id: user.id } });

            if (student) {
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
                        attributes: ['schedule_json']
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
                const announcementsCount = await Announcement.count({
                    where: {
                        is_active: true,
                        [Op.or]: [
                            { target_audience: 'all' },
                            { target_audience: 'students' }
                        ]
                    }
                });

                stats = {
                    activeCourses: activeEnrollments,
                    todayCourses: todayCoursesCount,
                    gpa: parseFloat(gpa).toFixed(2),
                    notifications: announcementsCount
                };
            }
        } else if (user.role === 'faculty') {
            const faculty = await Faculty.findOne({ where: { user_id: user.id } });

            if (faculty) {
                // Get sections taught by this faculty
                const sections = await CourseSection.findAll({
                    where: { instructor_id: faculty.id, is_active: true },
                    include: [{
                        model: Course,
                        as: 'course',
                        attributes: ['code', 'name']
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
                const pendingSessions = await AttendanceSession.count({
                    where: {
                        instructor_id: faculty.id,
                        status: 'active'
                    }
                });

                stats = {
                    teachingCourses: sections.length,
                    totalStudents: totalStudents,
                    todayCourses: todayCoursesCount,
                    activeSessions: pendingSessions
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
                totalUsers: totalUsers,
                activeStudents: activeStudents,
                facultyCount: facultyCount,
                departmentsCount: departmentsCount
            };
        }

        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'İstatistikler yüklenirken hata oluştu',
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

        // Get recent announcements (for all users)
        const announcements = await Announcement.findAll({
            where: {
                is_active: true,
                ...(user.role === 'student' && {
                    [Op.or]: [
                        { target_audience: 'all' },
                        { target_audience: 'students' }
                    ]
                }),
                ...(user.role === 'faculty' && {
                    [Op.or]: [
                        { target_audience: 'all' },
                        { target_audience: 'faculty' }
                    ]
                })
            },
            order: [['created_at', 'DESC']],
            limit: 5,
            attributes: ['id', 'title', 'created_at']
        });

        announcements.forEach(a => {
            activities.push({
                id: `announcement-${a.id}`,
                text: `Duyuru: ${a.title}`,
                time: a.created_at,
                type: 'info'
            });
        });

        // For students - get recent grade updates
        if (user.role === 'student') {
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
                        include: [{
                            model: Course,
                            as: 'course',
                            attributes: ['code', 'name']
                        }]
                    }]
                });

                recentEnrollments.forEach(e => {
                    if (e.section?.course) {
                        activities.push({
                            id: `grade-${e.id}`,
                            text: `${e.section.course.code} dersi için not girildi`,
                            time: e.updated_at,
                            type: 'success'
                        });
                    }
                });
            }
        }

        // For faculty - get recent attendance sessions
        if (user.role === 'faculty') {
            const faculty = await Faculty.findOne({ where: { user_id: user.id } });
            if (faculty) {
                const recentSessions = await AttendanceSession.findAll({
                    where: { instructor_id: faculty.id },
                    order: [['created_at', 'DESC']],
                    limit: 3,
                    include: [{
                        model: CourseSection,
                        as: 'section',
                        include: [{
                            model: Course,
                            as: 'course',
                            attributes: ['code', 'name']
                        }]
                    }]
                });

                recentSessions.forEach(s => {
                    if (s.section?.course) {
                        activities.push({
                            id: `session-${s.id}`,
                            text: `${s.section.course.code} dersi için yoklama ${s.status === 'completed' ? 'tamamlandı' : 'başlatıldı'}`,
                            time: s.created_at,
                            type: s.status === 'completed' ? 'success' : 'warning'
                        });
                    }
                });
            }
        }

        // Sort by time descending
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));

        // Format times to relative
        const now = new Date();
        const formattedActivities = activities.slice(0, 5).map(activity => {
            const activityTime = new Date(activity.time);
            const diffMs = now - activityTime;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            let timeText;
            if (diffMins < 60) {
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

        res.status(200).json({
            success: true,
            data: formattedActivities
        });
    } catch (error) {
        logger.error('Get recent activities error:', error);
        res.status(500).json({
            success: false,
            message: 'Aktiviteler yüklenirken hata oluştu',
            code: 'SERVER_ERROR'
        });
    }
};

module.exports = {
    getDashboardStats,
    getRecentActivities
};
