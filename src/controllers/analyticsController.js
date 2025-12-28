const db = require('../models');
const logger = require('../utils/logger');
const { Op, fn, col, literal } = require('sequelize');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const predictionService = require('../services/predictionService');

const {
    User, Student, Faculty, Department, Course, CourseSection,
    Enrollment, AttendanceSession, AttendanceRecord,
    MealReservation, MealMenu, Cafeteria, Event, EventRegistration,
    Wallet, Transaction
} = db;

/**
 * Get Admin Dashboard Statistics
 * GET /api/v1/analytics/dashboard
 */
const getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Initialize with default values
        let totalUsers = 0;
        let activeUsersToday = 0;
        let totalCourses = 0;
        let totalEnrollments = 0;
        let attendanceRate = 0;
        let mealReservationsToday = 0;
        let upcomingEvents = 0;
        let systemHealth = 'healthy';

        // Total users - with error handling
        try {
            totalUsers = await User.count({ where: { is_active: true } });
        } catch (e) {
            logger.warn('Error counting users:', e.message);
        }

        // Active users today
        try {
            activeUsersToday = await User.count({
                where: {
                    is_active: true,
                    updated_at: { [Op.gte]: today }
                }
            });
        } catch (e) {
            logger.warn('Error counting active users:', e.message);
        }

        // Total courses
        try {
            totalCourses = await Course.count();
        } catch (e) {
            logger.warn('Error counting courses:', e.message);
        }

        // Total enrollments
        try {
            totalEnrollments = await Enrollment.count({
                where: { status: 'enrolled' }
            });
        } catch (e) {
            logger.warn('Error counting enrollments:', e.message);
        }

        // Attendance rate (simplified - just count records)
        try {
            const totalRecords = await AttendanceRecord.count();
            const presentRecords = await AttendanceRecord.count({
                where: { status: 'present' }
            });
            attendanceRate = totalRecords > 0
                ? Math.round((presentRecords / totalRecords) * 100 * 10) / 10
                : 0;
        } catch (e) {
            logger.warn('Error calculating attendance:', e.message);
        }

        // Meal reservations today
        try {
            const todayStr = today.toISOString().split('T')[0];
            mealReservationsToday = await MealReservation.count({
                where: { date: todayStr }
            });
        } catch (e) {
            logger.warn('Error counting meal reservations:', e.message);
        }

        // Upcoming events
        try {
            const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
            upcomingEvents = await Event.count({
                where: {
                    date: {
                        [Op.gte]: today,
                        [Op.lte]: futureDate
                    },
                    status: 'published'
                }
            });
        } catch (e) {
            logger.warn('Error counting events:', e.message);
        }

        res.json({
            success: true,
            data: {
                totalUsers,
                activeUsersToday,
                totalCourses,
                totalEnrollments,
                attendanceRate,
                mealReservationsToday,
                upcomingEvents,
                systemHealth
            }
        });

    } catch (error) {
        logger.error('Error getting dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Dashboard istatistikleri alınamadı',
            error: error.message
        });
    }
};

/**
 * Get Academic Performance Analytics
 * GET /api/v1/analytics/academic-performance
 */
const getAcademicPerformance = async (req, res) => {
    try {
        // GPA by department
        const gpaByDepartment = await Student.findAll({
            attributes: [
                [col('department.name'), 'departmentName'],
                [fn('AVG', col('Student.gpa')), 'averageGpa'],
                [fn('COUNT', col('Student.id')), 'studentCount']
            ],
            include: [{
                model: Department,
                as: 'department',
                attributes: []
            }],
            where: {
                gpa: { [Op.not]: null }
            },
            group: ['department.id', 'department.name'],
            raw: true
        });

        // Grade distribution from enrollments
        const gradeDistribution = await Enrollment.findAll({
            attributes: [
                'letter_grade',
                [fn('COUNT', col('id')), 'count']
            ],
            where: {
                letter_grade: { [Op.not]: null }
            },
            group: ['letter_grade'],
            raw: true
        });

        // Debug logging
        logger.info('Grade Distribution Query Result:', JSON.stringify(gradeDistribution));

        // Calculate percentages
        const totalGrades = gradeDistribution.reduce((sum, g) => sum + parseInt(g.count), 0);
        const gradePercentages = {};
        gradeDistribution.forEach(g => {
            gradePercentages[g.letter_grade] = Math.round((parseInt(g.count) / totalGrades) * 100 * 10) / 10;
        });

        // Pass/fail rates - Support both US and Turkish grade systems
        // US: A, A-, B+, B, B-, C+, C, C-, D+, D
        // Turkish: AA, BA, BB, CB, CC, DC, DD (pass) | FF (fail)
        const passGrades = [
            // US format
            'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D',
            // Turkish format
            'AA', 'BA', 'BB', 'CB', 'CC', 'DC', 'DD'
        ];
        const passCount = gradeDistribution
            .filter(g => passGrades.includes(g.letter_grade))
            .reduce((sum, g) => sum + parseInt(g.count), 0);
        const failCount = totalGrades - passCount;

        // Top performing students
        const topStudents = await Student.findAll({
            attributes: ['id', 'student_number', 'gpa'],
            include: [{
                model: User,
                as: 'user',
                attributes: ['first_name', 'last_name']
            }, {
                model: Department,
                as: 'department',
                attributes: ['name']
            }],
            where: {
                gpa: { [Op.gte]: 3.5 }
            },
            order: [['gpa', 'DESC']],
            limit: 10
        });

        // At-risk students (GPA < 2.0)
        const atRiskStudents = await Student.findAll({
            attributes: ['id', 'student_number', 'gpa'],
            include: [{
                model: User,
                as: 'user',
                attributes: ['first_name', 'last_name', 'email']
            }, {
                model: Department,
                as: 'department',
                attributes: ['name']
            }],
            where: {
                gpa: { [Op.lt]: 2.0, [Op.not]: null }
            },
            order: [['gpa', 'ASC']],
            limit: 20
        });

        res.json({
            success: true,
            data: {
                gpaByDepartment: gpaByDepartment.map(d => ({
                    department: d.departmentName,
                    averageGpa: parseFloat(d.averageGpa).toFixed(2),
                    studentCount: parseInt(d.studentCount)
                })),
                gradeDistribution: gradePercentages,
                passFailRates: {
                    passRate: totalGrades > 0 ? Math.round((passCount / totalGrades) * 100 * 10) / 10 : 0,
                    failRate: totalGrades > 0 ? Math.round((failCount / totalGrades) * 100 * 10) / 10 : 0
                },
                topStudents: topStudents.map(s => ({
                    id: s.id,
                    studentNumber: s.student_number,
                    name: `${s.user.first_name} ${s.user.last_name}`,
                    department: s.department?.name,
                    gpa: s.gpa
                })),
                atRiskStudents: atRiskStudents.map(s => ({
                    id: s.id,
                    studentNumber: s.student_number,
                    name: `${s.user.first_name} ${s.user.last_name}`,
                    email: s.user.email,
                    department: s.department?.name,
                    gpa: s.gpa
                }))
            }
        });

    } catch (error) {
        logger.error('Error getting academic performance:', error);
        res.status(500).json({
            success: false,
            message: 'Akademik performans verileri alınamadı',
            error: error.message
        });
    }
};

/**
 * Get Attendance Analytics
 * GET /api/v1/analytics/attendance
 */
const getAttendanceAnalytics = async (req, res) => {
    try {
        // Initialize with empty arrays
        let attendanceByCourse = [];
        let attendanceTrends = [];
        let criticalAbsenceStudents = [];
        let lowAttendanceCourses = [];

        // Try to get attendance by course using Sequelize ORM
        try {
            const records = await AttendanceRecord.findAll({
                attributes: [
                    'status',
                    [fn('COUNT', col('AttendanceRecord.id')), 'count']
                ],
                include: [{
                    model: AttendanceSession,
                    as: 'session',
                    attributes: [],
                    include: [{
                        model: CourseSection,
                        as: 'section',
                        attributes: [],
                        include: [{
                            model: Course,
                            as: 'course',
                            attributes: ['code', 'name']
                        }]
                    }]
                }],
                group: ['session.section.course.id', 'status'],
                raw: true,
                nest: true
            });

            // Process into course-based format
            const courseMap = new Map();
            records.forEach(r => {
                const courseCode = r.session?.section?.course?.code || 'Unknown';
                const courseName = r.session?.section?.course?.name || 'Unknown';

                if (!courseMap.has(courseCode)) {
                    courseMap.set(courseCode, { courseCode, courseName, present: 0, total: 0 });
                }
                const course = courseMap.get(courseCode);
                course.total += parseInt(r.count) || 0;
                // Count both 'present' and 'late' as attended
                if (r.status === 'present' || r.status === 'late') {
                    course.present += parseInt(r.count) || 0;
                }
            });

            attendanceByCourse = Array.from(courseMap.values()).map(c => ({
                courseCode: c.courseCode,
                courseName: c.courseName,
                totalRecords: c.total,
                presentCount: c.present,
                attendanceRate: c.total > 0 ? Math.round((c.present / c.total) * 100 * 10) / 10 : 0
            }));

            // Debug logging
            logger.info('Attendance Records Query Result:', JSON.stringify(records));
            logger.info('Attendance By Course:', JSON.stringify(attendanceByCourse));

            lowAttendanceCourses = attendanceByCourse.filter(c => c.attendanceRate < 70);
        } catch (e) {
            logger.warn('Error getting attendance by course:', e.message);
        }

        // Get overall attendance stats
        try {
            const totalRecords = await AttendanceRecord.count();
            const presentRecords = await AttendanceRecord.count({ where: { status: 'present' } });
            const lateRecords = await AttendanceRecord.count({ where: { status: 'late' } });
            const absentRecords = await AttendanceRecord.count({ where: { status: 'absent' } });
            // Count both present and late as attended
            const attendedCount = presentRecords + lateRecords;

            attendanceTrends = [{
                label: 'Genel İstatistik',
                totalRecords,
                presentCount: attendedCount,
                absentCount: absentRecords,
                attendanceRate: totalRecords > 0 ? Math.round((attendedCount / totalRecords) * 100 * 10) / 10 : 0
            }];
        } catch (e) {
            logger.warn('Error getting attendance trends:', e.message);
        }

        // Get students with critical absence rate (> 30% absence)
        try {
            // Get all students with their attendance records
            const students = await Student.findAll({
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['first_name', 'last_name', 'email']
                }],
                attributes: ['id', 'student_number']
            });

            for (const student of students) {
                // Count this student's attendance records
                const studentRecords = await AttendanceRecord.findAll({
                    where: { student_id: student.id },
                    attributes: ['status'],
                    raw: true
                });

                if (studentRecords.length > 0) {
                    const totalAttendance = studentRecords.length;
                    const absentCount = studentRecords.filter(r => r.status === 'absent').length;
                    const absenceRate = Math.round((absentCount / totalAttendance) * 100 * 10) / 10;

                    // If absence rate > 30%, add to critical list
                    if (absenceRate > 30) {
                        criticalAbsenceStudents.push({
                            studentNumber: student.student_number,
                            firstName: student.user?.first_name,
                            lastName: student.user?.last_name,
                            email: student.user?.email,
                            absenceRate
                        });
                    }
                }
            }

            // Sort by highest absence rate first
            criticalAbsenceStudents.sort((a, b) => b.absenceRate - a.absenceRate);
        } catch (e) {
            logger.warn('Error getting critical absence students:', e.message);
        }

        res.json({
            success: true,
            data: {
                attendanceByCourse,
                attendanceTrends,
                criticalAbsenceStudents,
                lowAttendanceCourses
            }
        });

    } catch (error) {
        logger.error('Error getting attendance analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Yoklama analitiği alınamadı',
            error: error.message
        });
    }
};

/**
 * Get Meal Usage Analytics
 * GET /api/v1/analytics/meal-usage
 */
const getMealUsageAnalytics = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));

        // Daily meal counts
        const dailyMealCounts = await MealReservation.findAll({
            attributes: [
                [fn('DATE', col('date')), 'date'],
                [fn('COUNT', col('id')), 'count']
            ],
            where: {
                date: { [Op.gte]: startDate }
            },
            group: [fn('DATE', col('date'))],
            order: [[fn('DATE', col('date')), 'ASC']],
            raw: true
        });

        // Cafeteria utilization
        const cafeteriaUtilization = await MealReservation.findAll({
            attributes: [
                [col('cafeteria.name'), 'cafeteriaName'],
                [fn('COUNT', col('MealReservation.id')), 'reservationCount']
            ],
            include: [{
                model: Cafeteria,
                as: 'cafeteria',
                attributes: []
            }],
            where: {
                date: { [Op.gte]: startDate }
            },
            group: ['cafeteria.id', 'cafeteria.name'],
            raw: true
        });

        // Peak hours (by meal type)
        const mealTypeDistribution = await MealReservation.findAll({
            attributes: [
                'meal_type',
                [fn('COUNT', col('id')), 'count']
            ],
            where: {
                date: { [Op.gte]: startDate }
            },
            group: ['meal_type'],
            raw: true
        });

        // Revenue (from used reservations with price)
        const revenueData = await db.sequelize.query(`
      SELECT 
        DATE(mr.date) as date,
        SUM(mm.price) as revenue
      FROM meal_reservations mr
      JOIN meal_menus mm ON mr.menu_id = mm.id
      WHERE mr.date >= :startDate AND mr.status = 'used'
      GROUP BY DATE(mr.date)
      ORDER BY date ASC
    `, {
            replacements: { startDate },
            type: db.Sequelize.QueryTypes.SELECT
        });

        // Total revenue
        const totalRevenue = revenueData.reduce((sum, r) => sum + parseFloat(r.revenue || 0), 0);

        res.json({
            success: true,
            data: {
                dailyMealCounts,
                cafeteriaUtilization,
                mealTypeDistribution,
                revenueData,
                totalRevenue,
                peakHours: {
                    breakfast: '07:00 - 09:00',
                    lunch: '11:30 - 13:30',
                    dinner: '17:00 - 19:00'
                }
            }
        });

    } catch (error) {
        logger.error('Error getting meal usage analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Yemek kullanım analitiği alınamadı',
            error: error.message
        });
    }
};

/**
 * Get Event Analytics
 * GET /api/v1/analytics/events
 */
const getEventAnalytics = async (req, res) => {
    try {
        // Initialize with defaults
        let popularEvents = [];
        let avgRegistrationRate = 0;
        let checkInRate = 0;
        let categoryBreakdown = [];

        // Most popular events (by registration count)
        try {
            popularEvents = await Event.findAll({
                attributes: [
                    'id', 'title', 'category', 'capacity', 'date',
                    [fn('COUNT', col('registrations.id')), 'registrationCount']
                ],
                include: [{
                    model: EventRegistration,
                    as: 'registrations',
                    attributes: [],
                    required: false
                }],
                group: ['Event.id'],
                order: [[literal('registrationCount'), 'DESC']],
                limit: 10,
                subQuery: false
            });
        } catch (e) {
            logger.warn('Error getting popular events:', e.message);
            // Fallback: get events without registration count
            try {
                popularEvents = await Event.findAll({
                    attributes: ['id', 'title', 'category', 'capacity', 'date'],
                    order: [['date', 'DESC']],
                    limit: 10
                });
            } catch (e2) {
                logger.warn('Fallback for popular events also failed:', e2.message);
            }
        }

        // Registration rates
        try {
            const eventsWithRates = await Event.findAll({
                attributes: [
                    'id', 'title', 'capacity',
                    [fn('COUNT', col('registrations.id')), 'registrationCount']
                ],
                include: [{
                    model: EventRegistration,
                    as: 'registrations',
                    attributes: [],
                    required: false
                }],
                where: {
                    capacity: { [Op.gt]: 0 }
                },
                group: ['Event.id'],
                raw: true,
                subQuery: false
            });

            avgRegistrationRate = eventsWithRates.length > 0
                ? eventsWithRates.reduce((sum, e) => sum + (parseInt(e.registrationCount || 0) / e.capacity), 0) / eventsWithRates.length * 100
                : 0;
        } catch (e) {
            logger.warn('Error getting registration rates:', e.message);
        }

        // Check-in rates - simpler approach
        try {
            const totalRegs = await EventRegistration.count();
            const checkedInRegs = await EventRegistration.count({ where: { checked_in: true } });
            checkInRate = totalRegs > 0 ? (checkedInRegs / totalRegs) * 100 : 0;
        } catch (e) {
            logger.warn('Error getting check-in rates:', e.message);
        }

        // Category breakdown
        try {
            categoryBreakdown = await Event.findAll({
                attributes: [
                    'category',
                    [fn('COUNT', col('id')), 'count']
                ],
                group: ['category'],
                raw: true
            });
        } catch (e) {
            logger.warn('Error getting category breakdown:', e.message);
        }

        res.json({
            success: true,
            data: {
                popularEvents: popularEvents.map(e => ({
                    id: e.id,
                    title: e.title,
                    category: e.category,
                    capacity: e.capacity,
                    startDate: e.date,
                    registrationCount: e.dataValues.registrationCount
                })),
                registrationRate: Math.round(avgRegistrationRate * 10) / 10,
                checkInRate: Math.round(checkInRate * 10) / 10,
                categoryBreakdown
            }
        });

    } catch (error) {
        logger.error('Error getting event analytics:', error);
        res.status(500).json({
            success: false,
            message: 'Etkinlik analitiği alınamadı',
            error: error.message
        });
    }
};

/**
 * Export Report
 * GET /api/v1/analytics/export/:type
 * Supports: csv, json, pdf, excel formats
 */
const exportReport = async (req, res) => {
    try {
        const { type } = req.params;
        const { format = 'csv' } = req.query;

        let data;
        let filename;
        let reportTitle;

        switch (type) {
            case 'academic':
                const academicData = await getAcademicDataForExport();
                data = academicData;
                filename = `academic_report_${Date.now()}`;
                reportTitle = 'Akademik Performans Raporu';
                break;
            case 'attendance':
                const attendanceData = await getAttendanceDataForExport();
                data = attendanceData;
                filename = `attendance_report_${Date.now()}`;
                reportTitle = 'Yoklama Raporu';
                break;
            case 'meal':
                const mealData = await getMealDataForExport();
                data = mealData;
                filename = `meal_report_${Date.now()}`;
                reportTitle = 'Yemek Kullanım Raporu';
                break;
            case 'event':
                const eventData = await getEventDataForExport();
                data = eventData;
                filename = `event_report_${Date.now()}`;
                reportTitle = 'Etkinlik Raporu';
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Geçersiz rapor tipi. Desteklenen tipler: academic, attendance, meal, event'
                });
        }

        // Handle different formats
        switch (format.toLowerCase()) {
            case 'csv':
                const csv = convertToCSV(data);
                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
                return res.send('\uFEFF' + csv); // BOM for Excel UTF-8 support

            case 'json':
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename=${filename}.json`);
                return res.json({ success: true, data, exportedAt: new Date().toISOString() });

            case 'pdf':
                const pdfBuffer = await generatePDF(data, reportTitle);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);
                return res.send(pdfBuffer);

            case 'excel':
            case 'xlsx':
                const excelBuffer = await generateExcel(data, reportTitle);
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
                return res.send(excelBuffer);

            default:
                return res.status(400).json({
                    success: false,
                    message: 'Geçersiz format. Desteklenen formatlar: csv, json, pdf, excel'
                });
        }

    } catch (error) {
        logger.error('Error exporting report:', error);
        res.status(500).json({
            success: false,
            message: 'Rapor dışa aktarılamadı',
            error: error.message
        });
    }
};

/**
 * Generate PDF from data
 */
const generatePDF = (data, title) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Title
            doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
            doc.moveDown();
            doc.fontSize(10).font('Helvetica').text(`Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}`, { align: 'center' });
            doc.moveDown(2);

            if (!data || data.length === 0) {
                doc.fontSize(12).text('Veri bulunamadı', { align: 'center' });
                doc.end();
                return;
            }

            const headers = Object.keys(data[0]);
            const columnWidth = (doc.page.width - 100) / Math.min(headers.length, 5);

            // Table header
            doc.fontSize(9).font('Helvetica-Bold');
            let x = 50;
            headers.slice(0, 5).forEach(header => {
                doc.text(header.substring(0, 15), x, doc.y, { width: columnWidth, align: 'left' });
                x += columnWidth;
            });
            doc.moveDown();

            // Horizontal line
            doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
            doc.moveDown(0.5);

            // Table rows
            doc.font('Helvetica').fontSize(8);
            const maxRows = 50; // Limit for PDF
            data.slice(0, maxRows).forEach((row, index) => {
                if (doc.y > doc.page.height - 100) {
                    doc.addPage();
                }

                x = 50;
                headers.slice(0, 5).forEach(header => {
                    const val = row[header] !== null && row[header] !== undefined ? String(row[header]).substring(0, 20) : '-';
                    doc.text(val, x, doc.y, { width: columnWidth, align: 'left' });
                    x += columnWidth;
                });
                doc.moveDown(0.5);
            });

            if (data.length > maxRows) {
                doc.moveDown();
                doc.fontSize(10).text(`... ve ${data.length - maxRows} kayıt daha (CSV veya Excel formatında tamamını görebilirsiniz)`, { align: 'center' });
            }

            // Footer
            doc.moveDown(2);
            doc.fontSize(8).text(`Toplam Kayıt: ${data.length}`, { align: 'right' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Generate Excel from data
 */
const generateExcel = async (data, title) => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DKÜ OBS';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(title.substring(0, 31));

    if (!data || data.length === 0) {
        worksheet.addRow(['Veri bulunamadı']);
        return workbook.xlsx.writeBuffer();
    }

    const headers = Object.keys(data[0]);

    // Add title row
    worksheet.mergeCells(1, 1, 1, headers.length);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Add date row
    worksheet.mergeCells(2, 1, 2, headers.length);
    const dateCell = worksheet.getCell('A2');
    dateCell.value = `Oluşturulma Tarihi: ${new Date().toLocaleString('tr-TR')}`;
    dateCell.font = { size: 10, italic: true };
    dateCell.alignment = { horizontal: 'center' };

    // Add blank row
    worksheet.addRow([]);

    // Header row
    const headerRow = worksheet.addRow(headers);
    headerRow.eachCell((cell) => {
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF8B5CF6' } // Primary violet
        };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { horizontal: 'center' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // Data rows
    data.forEach((row, index) => {
        const dataRow = worksheet.addRow(headers.map(h => row[h] !== null && row[h] !== undefined ? row[h] : ''));
        dataRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            // Alternate row colors
            if (index % 2 === 0) {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF5F3FF' } // Light violet
                };
            }
        });
    });

    // Auto-fit columns
    worksheet.columns.forEach(column => {
        let maxLength = 10;
        column.eachCell({ includeEmpty: true }, cell => {
            const cellValue = cell.value ? String(cell.value) : '';
            if (cellValue.length > maxLength) {
                maxLength = Math.min(cellValue.length, 30);
            }
        });
        column.width = maxLength + 2;
    });

    // Add summary row
    worksheet.addRow([]);
    const summaryRow = worksheet.addRow([`Toplam Kayıt: ${data.length}`]);
    summaryRow.font = { bold: true };

    return workbook.xlsx.writeBuffer();
};


// Helper functions for export
const getAcademicDataForExport = async () => {
    const students = await Student.findAll({
        attributes: ['student_number', 'gpa', 'year', 'semester'],
        include: [{
            model: User,
            as: 'user',
            attributes: ['first_name', 'last_name', 'email']
        }, {
            model: Department,
            as: 'department',
            attributes: ['name']
        }]
    });

    return students.map(s => ({
        studentNumber: s.student_number,
        firstName: s.user.first_name,
        lastName: s.user.last_name,
        email: s.user.email,
        department: s.department?.name,
        gpa: s.gpa,
        year: s.year,
        semester: s.semester
    }));
};

const getAttendanceDataForExport = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const records = await AttendanceRecord.findAll({
        attributes: ['status', 'check_in_time'],
        include: [{
            model: Student,
            as: 'student',
            attributes: ['student_number'],
            include: [{
                model: User,
                as: 'user',
                attributes: ['first_name', 'last_name']
            }]
        }, {
            model: AttendanceSession,
            as: 'session',
            attributes: ['session_date'],
            where: { session_date: { [Op.gte]: thirtyDaysAgo } },
            include: [{
                model: CourseSection,
                as: 'section',
                include: [{
                    model: Course,
                    as: 'course',
                    attributes: ['code', 'name']
                }]
            }]
        }],
        limit: 1000
    });

    return records.map(r => ({
        date: r.session.session_date,
        courseCode: r.session.section.course.code,
        courseName: r.session.section.course.name,
        studentNumber: r.student.student_number,
        studentName: `${r.student.user.first_name} ${r.student.user.last_name}`,
        status: r.status,
        checkInTime: r.check_in_time
    }));
};

const getMealDataForExport = async () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const reservations = await MealReservation.findAll({
        attributes: ['date', 'meal_type', 'status'],
        include: [{
            model: User,
            as: 'user',
            attributes: ['first_name', 'last_name', 'email']
        }, {
            model: Cafeteria,
            as: 'cafeteria',
            attributes: ['name']
        }, {
            model: MealMenu,
            as: 'menu',
            attributes: ['meal_type', 'price']
        }],
        where: {
            date: { [Op.gte]: thirtyDaysAgo }
        },
        limit: 1000
    });

    return reservations.map(r => ({
        date: r.date,
        mealType: r.meal_type,
        userName: `${r.user.first_name} ${r.user.last_name}`,
        email: r.user.email,
        cafeteria: r.cafeteria?.name,
        menuItem: r.menu?.meal_type,
        price: r.menu?.price,
        status: r.status
    }));
};

const getEventDataForExport = async () => {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const events = await Event.findAll({
        attributes: ['title', 'category', 'date', 'location', 'capacity'],
        include: [{
            model: EventRegistration,
            as: 'registrations',
            attributes: ['status', 'checked_in'],
            include: [{
                model: User,
                as: 'user',
                attributes: ['first_name', 'last_name', 'email']
            }]
        }],
        where: {
            date: { [Op.gte]: ninetyDaysAgo }
        }
    });

    const exportData = [];
    events.forEach(e => {
        e.registrations.forEach(r => {
            exportData.push({
                eventTitle: e.title,
                category: e.category,
                startDate: e.date,
                location: e.location,
                capacity: e.capacity,
                userName: `${r.user.first_name} ${r.user.last_name}`,
                email: r.user.email,
                registrationStatus: r.status,
                checkedIn: r.checked_in
            });
        });
    });

    return exportData;
};

const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
        const values = headers.map(header => {
            const val = row[header];
            if (val === null || val === undefined) return '';
            if (typeof val === 'string' && val.includes(',')) {
                return `"${val}"`;
            }
            return val;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
};

/**
 * Get Attendance Predictions for Student
 * GET /api/v1/analytics/attendance/predictions/student/:studentId
 */
const getStudentAttendancePrediction = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { sectionId } = req.query;

        const prediction = await predictionService.predictStudentAttendance(studentId, sectionId || null);

        res.json({
            success: true,
            data: prediction
        });
    } catch (error) {
        logger.error('Error getting student attendance prediction:', error);
        res.status(500).json({
            success: false,
            message: 'Tahmin alınamadı',
            error: error.message
        });
    }
};

/**
 * Get Attendance Predictions for Section
 * GET /api/v1/analytics/attendance/predictions/section/:sectionId
 */
const getSectionAttendancePrediction = async (req, res) => {
    try {
        const { sectionId } = req.params;

        const prediction = await predictionService.predictSectionAttendance(sectionId);

        res.json({
            success: true,
            data: prediction
        });
    } catch (error) {
        logger.error('Error getting section attendance prediction:', error);
        res.status(500).json({
            success: false,
            message: 'Tahmin alınamadı',
            error: error.message
        });
    }
};

/**
 * Get At-Risk Students for Section
 * GET /api/v1/analytics/attendance/predictions/at-risk/:sectionId
 */
const getAtRiskStudents = async (req, res) => {
    try {
        const { sectionId } = req.params;
        const threshold = parseFloat(req.query.threshold) || 70;

        const atRiskStudents = await predictionService.predictAtRiskStudents(sectionId, threshold);

        res.json({
            success: true,
            data: {
                atRiskStudents,
                count: atRiskStudents.length,
                threshold
            }
        });
    } catch (error) {
        logger.error('Error getting at-risk students:', error);
        res.status(500).json({
            success: false,
            message: 'Risk analizi alınamadı',
            error: error.message
        });
    }
};

module.exports = {
    getDashboardStats,
    getAcademicPerformance,
    getAttendanceAnalytics,
    getMealUsageAnalytics,
    getEventAnalytics,
    exportReport,
    getStudentAttendancePrediction,
    getSectionAttendancePrediction,
    getAtRiskStudents
};
