const db = require('../models');
const { Student, Faculty, Enrollment, CourseSection, Course } = db;
const gradeCalculationService = require('../services/gradeCalculationService');
const logger = require('../utils/logger');

/**
 * Get student's grades
 * GET /api/v1/grades/my-grades
 */
const getMyGrades = async (req, res) => {
  try {
    const { semester, year } = req.query;

    logger.info(`📊 Get my grades - User: ${req.user.id}, Filters: ${JSON.stringify({ semester, year })}`);

    // Get student ID from user
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      logger.warn(`❌ Student not found for user: ${req.user.id}`);
      return res.status(403).json({
        success: false,
        message: 'Öğrenci kaydı bulunamadı',
      });
    }

    logger.info(`✅ Student found: ${student.id} (${student.student_number})`);

    const whereClause = {
      student_id: student.id,
    };

    const sectionWhere = {};
    if (semester) sectionWhere.semester = semester;
    if (year) sectionWhere.year = parseInt(year);

    logger.info(`🔍 Fetching enrollments with filters: ${JSON.stringify({ whereClause, sectionWhere })}`);
    const enrollments = await Enrollment.findAll({
      where: whereClause,
      include: [
        {
          model: CourseSection,
          as: 'section',
          where: Object.keys(sectionWhere).length > 0 ? sectionWhere : undefined,
          required: false,
          include: [
            { model: Course, as: 'course', attributes: ['id', 'code', 'name', 'credits', 'ects'], required: false },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    logger.info(`✅ Found ${enrollments.length} enrollments`);

    const grades = enrollments.map((e) => ({
      enrollmentId: e.id,
      course: {
        code: e.section?.course?.code,
        name: e.section?.course?.name,
        credits: e.section?.course?.credits,
        ects: e.section?.course?.ects,
      },
      semester: e.section?.semester,
      year: e.section?.year,
      grades: {
        midterm: e.midterm_grade,
        final: e.final_grade,
        homework: e.homework_grade,
        average: e.average_grade,
        letterGrade: e.letter_grade,
        gradePoint: e.grade_point,
      },
      status: e.status,
      isRepeat: e.is_repeat,
    }));

    // Calculate GPA
    logger.info(`📈 Calculating CGPA for student: ${student.id}`);
    const { cgpa, totalCredits, semesters } = await gradeCalculationService.calculateCGPA(student.id);
    logger.info(`✅ CGPA calculated: ${cgpa}, Total Credits: ${totalCredits}, Semesters: ${semesters.length}`);

    res.json({
      success: true,
      data: {
        grades,
        summary: {
          cgpa,
          totalCredits,
          semesters: semesters.map((s) => ({
            semester: s.semester,
            year: s.year,
            gpa: s.gpa,
            credits: s.totalCredits,
          })),
        },
      },
    });
  } catch (error) {
    logger.error('❌ Get my grades error:', {
      error: error.message,
      stack: error.stack,
      user: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: 'Notlar alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get transcript (JSON)
 * GET /api/v1/grades/transcript
 */
const getTranscript = async (req, res) => {
  try {
    logger.info(`📄 Get transcript - User: ${req.user.id}`);

    // Get student ID from user
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      logger.warn(`❌ Student not found for user: ${req.user.id}`);
      return res.status(403).json({
        success: false,
        message: 'Öğrenci kaydı bulunamadı',
      });
    }

    logger.info(`✅ Student found: ${student.id} (${student.student_number})`);
    const transcript = await gradeCalculationService.getTranscript(student.id);
    logger.info(`✅ Transcript generated for student: ${student.id}`);

    res.json({
      success: true,
      data: transcript,
    });
  } catch (error) {
    logger.error('❌ Get transcript error:', {
      error: error.message,
      stack: error.stack,
      user: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: 'Transkript alınırken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Get transcript as PDF
 * GET /api/v1/grades/transcript/pdf
 */
/**
 * Get transcript as PDF
 * GET /api/v1/grades/transcript/pdf
 */
const getTranscriptPDF = async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const fs = require('fs');
    const path = require('path');

    logger.info(`📄 Get transcript PDF - User: ${req.user.id}`);

    // Get student ID from user
    const student = await Student.findOne({ where: { user_id: req.user.id } });
    if (!student) {
      logger.warn(`❌ Student not found for user: ${req.user.id}`);
      return res.status(403).json({
        success: false,
        message: 'Öğrenci kaydı bulunamadı',
      });
    }

    logger.info(`✅ Student found: ${student.id} (${student.student_number})`);
    const transcript = await gradeCalculationService.getTranscript(student.id);
    logger.info(`✅ Transcript data fetched, generating PDF`);

    // Create a document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 40
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=transkript_${student.student_number}.pdf`);

    // Pipe the document to response
    doc.pipe(res);

    // Load embedded Roboto font (supports Turkish characters)
    const fontDir = path.join(__dirname, '../assets/fonts');
    const robotoRegular = path.join(fontDir, 'Roboto-Regular.ttf');
    const robotoBold = path.join(fontDir, 'Roboto-Bold.ttf');

    // Register fonts
    if (fs.existsSync(robotoRegular)) {
      doc.registerFont('Roboto', robotoRegular);
      logger.info(`✅ Roboto Regular font loaded from: ${robotoRegular}`);
    } else {
      logger.warn(`⚠️ Roboto Regular font not found at: ${robotoRegular}, using Helvetica`);
    }

    if (fs.existsSync(robotoBold)) {
      doc.registerFont('Roboto-Bold', robotoBold);
      logger.info(`✅ Roboto Bold font loaded from: ${robotoBold}`);
    }

    // Use Roboto if available, otherwise Helvetica
    const fontRegular = fs.existsSync(robotoRegular) ? 'Roboto' : 'Helvetica';
    const fontBold = fs.existsSync(robotoBold) ? 'Roboto-Bold' : 'Helvetica-Bold';

    // Helper for Turkish chars
    const tr = (text) => text || '';

    doc.font(fontRegular);

    // --- HEADER ---
    doc.font(fontBold).fontSize(20).text('ÜNİVERSİTE OBS SİSTEMİ', { align: 'center' });
    doc.moveDown(0.5);
    doc.font(fontBold).fontSize(14).text('ÖĞRENCİ BELGESİ', { align: 'center', underline: true });
    doc.moveDown(2);
    doc.font(fontRegular);

    // --- STUDENT INFO ---
    doc.fontSize(10);
    const infoX = 50;
    const valueX = 160;
    const infoX2 = 320;
    const valueX2 = 400;
    let y = doc.y;

    doc.font(fontBold).text('Öğrenci No', infoX, y);
    doc.font(fontRegular).text(': ' + transcript.student.studentNumber, valueX, y);
    doc.font(fontBold).text('T.C. Kimlik No', infoX2, y);
    doc.font(fontRegular).text(': ***********' + (transcript.student.citizenshipId?.slice(-2) || 'XX'), valueX2, y);
    y += 15;

    doc.font(fontBold).text('Adı Soyadı', infoX, y);
    doc.font(fontRegular).text(': ' + tr(`${transcript.student.firstName} ${transcript.student.lastName}`), valueX, y);
    doc.font(fontBold).text('Kayıt Tarihi', infoX2, y);
    doc.font(fontRegular).text(': ' + (transcript.student.enrollmentDate || '-'), valueX2, y);
    y += 15;

    doc.font(fontBold).text('Bölüm', infoX, y);
    doc.font(fontRegular).text(': ' + tr(transcript.student.department || '-'), valueX, y);
    doc.font(fontBold).text('Öğrenim Türü', infoX2, y);
    doc.font(fontRegular).text(': Örgün Öğretim', valueX2, y);
    y += 15;

    doc.font(fontBold).text('Durumu', infoX, y);
    doc.font(fontRegular).text(': Aktif', valueX, y);
    y += 25;

    doc.y = y;

    // --- GRADES TABLE ---
    const semesterNames = {
      fall: 'Güz',
      spring: 'Bahar',
      summer: 'Yaz',
    };

    const colX = { code: 50, name: 130, cred: 380, grade: 430, point: 480 };

    transcript.semesters.forEach(sem => {
      // Check page break
      if (doc.y > 700) doc.addPage();

      // Semester Header
      doc.rect(40, doc.y, 515, 20).fill('#f0f0f0');
      doc.fillColor('black');
      doc.fontSize(11).font(fontBold).text(
        `${sem.year} - ${tr(semesterNames[sem.semester] || sem.semester)} Dönemi`,
        50, doc.y - 15
      );
      doc.moveDown(0.5);

      // Table Headers
      doc.fontSize(9).font(fontBold);
      const headersY = doc.y;
      doc.text('Ders Kodu', colX.code, headersY);
      doc.text('Ders Adı', colX.name, headersY);
      doc.text('Kredi', colX.cred, headersY);
      doc.text('Not', colX.grade, headersY);
      doc.text('Puan', colX.point, headersY);

      doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).stroke();
      doc.moveDown(0.5);

      // Courses
      doc.font(fontRegular);
      sem.courses.forEach(course => {
        if (doc.y > 750) {
          doc.addPage();
          doc.fontSize(9).font(fontRegular); // Reset font after new page
        }

        const rowY = doc.y;
        doc.text(course.code, colX.code, rowY);
        doc.text(tr(course.name).substring(0, 45), colX.name, rowY, { width: 240 });
        doc.text(String(course.credits), colX.cred, rowY);
        doc.text(course.letterGrade || '-', colX.grade, rowY);
        doc.text(course.gradePoint?.toFixed(2) || '-', colX.point, rowY);

        doc.moveDown(0.8);
      });

      // Semester Summary
      doc.moveDown(0.5);
      doc.fontSize(10).font(fontBold);
      doc.text(
        `Dönem Ortalaması (GPA): ${sem.gpa.toFixed(2)}       Dönem Kredisi: ${sem.totalCredits}`,
        { align: 'right' }
      );
      doc.moveDown(1.5);
    });

    // --- OVERALL SUMMARY ---
    doc.moveDown(1);
    const summaryStartY = doc.y;
    doc.rect(40, summaryStartY, 515, 60).stroke();

    doc.font(fontBold).fontSize(12).text('GENEL ÖZET', 50, summaryStartY + 10, { align: 'center', width: 500 });

    doc.font(fontRegular).fontSize(10);
    doc.text(`Genel Not Ortalaması (CGPA): ${transcript.academic.cgpa.toFixed(2)}`, 60, summaryStartY + 35);
    doc.text(`Toplam Kredi: ${transcript.academic.totalCredits}`, 300, summaryStartY + 35);

    // --- FOOTER ---
    const bottom = doc.page.height - 50;
    doc.font(fontRegular).fontSize(8).text(
      `Bu belge ${new Date(transcript.generatedAt).toLocaleString('tr-TR')} tarihinde oluşturulmuştur. Elektronik ortamda üretilmiştir, ıslak imza gerektirmez.`,
      50, bottom, { align: 'center', width: 500 }
    );

    doc.end();
    logger.info(`✅ Transcript PDF generated and sent`);

  } catch (error) {
    logger.error('❌ Get transcript PDF error:', {
      error: error.message,
      stack: error.stack,
      user: req.user?.id,
    });
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Transkript PDF oluşturulurken hata oluştu',
        error: error.message,
      });
    }
  }
};

/**
 * Enter grades for a section (faculty)
 * POST /api/v1/grades
 */
const enterGrades = async (req, res) => {
  try {
    const { enrollment_id, midterm, final, homework } = req.body;

    // Verify faculty
    const faculty = await Faculty.findOne({ where: { user_id: req.user.id } });
    if (!faculty && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim',
      });
    }

    // Get enrollment and verify instructor teaches this section
    const enrollment = await Enrollment.findByPk(enrollment_id, {
      include: [
        {
          model: CourseSection,
          as: 'section',
          include: [{ model: Course, as: 'course' }],
        },
        {
          model: Student,
          as: 'student',
          include: [{ model: db.User, as: 'user', attributes: ['id', 'email', 'first_name'] }],
        },
      ],
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Kayıt bulunamadı',
      });
    }

    if (faculty && enrollment.section.instructor_id !== faculty.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu dersin notlarını girme yetkiniz yok',
      });
    }

    // Validate grades
    const validateGrade = (grade) => {
      if (grade === undefined || grade === null) return true;
      const num = parseFloat(grade);
      return !isNaN(num) && num >= 0 && num <= 100;
    };

    if (!validateGrade(midterm) || !validateGrade(final) || !validateGrade(homework)) {
      return res.status(400).json({
        success: false,
        message: 'Notlar 0-100 arasında olmalıdır',
      });
    }

    // Update grades
    const grades = {};
    if (midterm !== undefined) grades.midterm = parseFloat(midterm);
    if (final !== undefined) grades.final = parseFloat(final);
    if (homework !== undefined) grades.homework = parseFloat(homework);

    const updatedEnrollment = await gradeCalculationService.updateGrades(enrollment_id, grades);

    // Update student's GPA
    await gradeCalculationService.updateStudentGPA(enrollment.student_id);

    logger.info(`Grades updated for enrollment ${enrollment_id} by ${req.user.id}`);

    // Send notification to student (async, don't wait for it)
    try {
      const { sendGradeUpdateEmail } = require('../services/emailService');
      const studentUser = await db.User.findByPk(enrollment.student.user_id);
      if (studentUser && studentUser.email) {
        sendGradeUpdateEmail(
          studentUser.email,
          studentUser.first_name,
          enrollment.section.course.code,
          enrollment.section.course.name,
          {
            midterm: updatedEnrollment.midterm_grade,
            final: updatedEnrollment.final_grade,
            homework: updatedEnrollment.homework_grade,
            average: updatedEnrollment.average_grade,
            letterGrade: updatedEnrollment.letter_grade,
          }
        ).catch((err) => {
          logger.warn(`Failed to send grade update email to ${studentUser.email}:`, err.message);
        });
      }
    } catch (emailError) {
      logger.warn('Error sending grade update email:', emailError.message);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Notlar başarıyla güncellendi',
      data: {
        student: {
          id: enrollment.student.id,
          studentNumber: enrollment.student.student_number,
        },
        course: {
          code: enrollment.section.course.code,
          name: enrollment.section.course.name,
        },
        grades: {
          midterm: updatedEnrollment.midterm_grade,
          final: updatedEnrollment.final_grade,
          homework: updatedEnrollment.homework_grade,
          average: updatedEnrollment.average_grade,
          letterGrade: updatedEnrollment.letter_grade,
          gradePoint: updatedEnrollment.grade_point,
        },
      },
    });
  } catch (error) {
    logger.error('Enter grades error:', error);
    res.status(500).json({
      success: false,
      message: 'Not girilirken hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Bulk enter grades for a section
 * POST /api/v1/grades/bulk
 */
const bulkEnterGrades = async (req, res) => {
  try {
    const { section_id, grades } = req.body;

    // Verify faculty
    const faculty = await Faculty.findOne({ where: { user_id: req.user.id } });
    if (!faculty && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim',
      });
    }

    // Verify instructor teaches this section
    const section = await CourseSection.findByPk(section_id);
    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section bulunamadı',
      });
    }

    if (faculty && section.instructor_id !== faculty.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Bu dersin notlarını girme yetkiniz yok',
      });
    }

    const results = [];
    const errors = [];

    for (const gradeEntry of grades) {
      try {
        const { enrollment_id, midterm, final, homework } = gradeEntry;

        const enrollment = await Enrollment.findOne({
          where: { id: enrollment_id, section_id },
          include: [
            {
              model: Student,
              as: 'student',
              include: [{ model: db.User, as: 'user', attributes: ['id', 'email', 'first_name'] }],
            },
            {
              model: CourseSection,
              as: 'section',
              include: [{ model: Course, as: 'course' }],
            },
          ],
        });

        if (!enrollment) {
          errors.push({ enrollment_id, error: 'Kayıt bulunamadı' });
          continue;
        }

        const gradeData = {};
        if (midterm !== undefined) gradeData.midterm = parseFloat(midterm);
        if (final !== undefined) gradeData.final = parseFloat(final);
        if (homework !== undefined) gradeData.homework = parseFloat(homework);

        const updated = await gradeCalculationService.updateGrades(enrollment_id, gradeData);
        await gradeCalculationService.updateStudentGPA(enrollment.student_id);

        // Send notification to student (async, don't wait for it)
        try {
          const { sendGradeUpdateEmail } = require('../services/emailService');
          if (enrollment.student?.user?.email) {
            sendGradeUpdateEmail(
              enrollment.student.user.email,
              enrollment.student.user.first_name,
              enrollment.section.course.code,
              enrollment.section.course.name,
              {
                midterm: updated.midterm_grade,
                final: updated.final_grade,
                homework: updated.homework_grade,
                average: updated.average_grade,
                letterGrade: updated.letter_grade,
              }
            ).catch((err) => {
              logger.warn(`Failed to send grade update email to ${enrollment.student.user.email}:`, err.message);
            });
          }
        } catch (emailError) {
          logger.warn('Error sending grade update email:', emailError.message);
        }

        results.push({
          enrollment_id,
          letterGrade: updated.letter_grade,
          gradePoint: updated.grade_point,
        });
      } catch (err) {
        errors.push({ enrollment_id: gradeEntry.enrollment_id, error: err.message });
      }
    }

    logger.info(`Bulk grades updated for section ${section_id} by ${req.user.id}`);

    res.json({
      success: true,
      message: `${results.length} not güncellendi, ${errors.length} hata oluştu`,
      data: { results, errors },
    });
  } catch (error) {
    logger.error('Bulk enter grades error:', error);
    res.status(500).json({
      success: false,
      message: 'Toplu not girişi sırasında hata oluştu',
      error: error.message,
    });
  }
};

/**
 * Generate HTML for transcript
 */
function generateTranscriptHTML(transcript) {
  const semesterNames = {
    fall: 'Güz',
    spring: 'Bahar',
    summer: 'Yaz',
  };

  let html = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Transkript - ${transcript.student.firstName} ${transcript.student.lastName}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .header h1 { margin: 0; color: #1a365d; }
    .header h2 { margin: 10px 0; color: #4a5568; }
    .student-info { margin-bottom: 30px; }
    .student-info table { width: 100%; }
    .student-info td { padding: 5px 0; }
    .semester { margin-bottom: 25px; }
    .semester h3 { background: #2d3748; color: white; padding: 10px; margin: 0; }
    .semester table { width: 100%; border-collapse: collapse; }
    .semester th, .semester td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    .semester th { background: #f7fafc; }
    .summary { margin-top: 30px; padding: 20px; background: #f7fafc; border-radius: 8px; }
    .summary h3 { margin-top: 0; }
    .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #718096; }
  </style>
</head>
<body>
  <div class="header">
    <h1>ÜNİVERSİTE ADI</h1>
    <h2>RESMİ TRANSKRİPT</h2>
  </div>
  
  <div class="student-info">
    <table>
      <tr>
        <td><strong>Öğrenci No:</strong> ${transcript.student.studentNumber}</td>
        <td><strong>Ad Soyad:</strong> ${transcript.student.firstName} ${transcript.student.lastName}</td>
      </tr>
      <tr>
        <td><strong>Bölüm:</strong> ${transcript.student.department || '-'}</td>
        <td><strong>Kayıt Tarihi:</strong> ${transcript.student.enrollmentDate || '-'}</td>
      </tr>
    </table>
  </div>
  `;

  for (const semester of transcript.semesters) {
    html += `
  <div class="semester">
    <h3>${semester.year} - ${semesterNames[semester.semester] || semester.semester}</h3>
    <table>
      <thead>
        <tr>
          <th>Ders Kodu</th>
          <th>Ders Adı</th>
          <th>Kredi</th>
          <th>Harf Notu</th>
          <th>Not Puanı</th>
        </tr>
      </thead>
      <tbody>
    `;

    for (const course of semester.courses) {
      html += `
        <tr>
          <td>${course.code}</td>
          <td>${course.name}</td>
          <td>${course.credits}</td>
          <td>${course.letterGrade || '-'}</td>
          <td>${course.gradePoint?.toFixed(2) || '-'}</td>
        </tr>
      `;
    }

    html += `
      </tbody>
    </table>
    <p><strong>Dönem GPA:</strong> ${semester.gpa.toFixed(2)} | <strong>Dönem Kredi:</strong> ${semester.totalCredits}</p>
  </div>
    `;
  }

  html += `
  <div class="summary">
    <h3>Genel Özet</h3>
    <p><strong>Genel Not Ortalaması (CGPA):</strong> ${transcript.academic.cgpa.toFixed(2)}</p>
    <p><strong>Toplam Kredi:</strong> ${transcript.academic.totalCredits}</p>
    <p><strong>Mevcut Dönem:</strong> ${transcript.academic.currentSemester}</p>
  </div>
  
  <div class="footer">
    <p>Bu belge ${new Date(transcript.generatedAt).toLocaleString('tr-TR')} tarihinde oluşturulmuştur.</p>
    <p>Resmi belge niteliğinde değildir.</p>
  </div>
</body>
</html>
  `;

  return html;
}

module.exports = {
  getMyGrades,
  getTranscript,
  getTranscriptPDF,
  enterGrades,
  bulkEnterGrades,
};


