const PDFDocument = require('pdfkit');
const fs = require('fs');
const db = require('../models');
const logger = require('../utils/logger');
const { Student, User, Department, Faculty } = db;

/**
 * Generate Student Certificate PDF
 * GET /api/v1/users/students/certificate
 */
const generateCertificate = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch student details with department and faculty info
        const student = await Student.findOne({
            where: { user_id: userId },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['first_name', 'last_name', 'email']
                },
                {
                    model: Department,
                    as: 'department',
                    attributes: ['name']
                }
            ]
        });

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Öğrenci kaydı bulunamadı'
            });
        }

        // Create a document
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=ogrenci-belgesi-${student.student_number}.pdf`);

        // Pipe the document to response
        doc.pipe(res);

        // Try to load a font that supports Turkish characters
        // On Windows, Arial is usually safe
        let fontPath = 'Helvetica'; // Default fallback
        const windowsFontPath = 'C:\\Windows\\Fonts\\arial.ttf';

        if (fs.existsSync(windowsFontPath)) {
            fontPath = windowsFontPath;
        }

        // Helper function for Turkish characters
        const tr = (text) => text || '';

        // Add logic to use the font
        doc.font(fontPath);

        // Header (University Name)
        doc.fontSize(24).text('ÜNİVERSİTE OBS SİSTEMİ', { align: 'center' });
        doc.moveDown();

        doc.fontSize(16).text('ÖĞRENCİ BELGESİ', { align: 'center', underline: true });
        doc.moveDown(2);

        // Date
        doc.fontSize(10).text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, { align: 'right' });
        doc.moveDown(2);

        // Student Info Content
        doc.fontSize(12);

        const infoX = 100;
        const valueX = 250;
        let y = doc.y;

        // Info helper
        const addInfoRow = (label, value) => {
            doc.text(label, infoX, y, { width: 150 });
            doc.text(': ' + value, valueX, y);
            y += 20;
        };

        addInfoRow('Öğrenci Numarası', student.student_number);
        addInfoRow('Adı Soyadı', `${tr(student.user.first_name)} ${tr(student.user.last_name)}`);
        addInfoRow('T.C. Kimlik No', '***********' + (student.user.citizenship_id?.slice(-2) || '12')); // Masked for privacy demo

        if (student.department) {
            addInfoRow('Bölümü', tr(student.department.name));
        }

        addInfoRow('Sınıfı', student.grade || '1. Sınıf');
        addInfoRow('Öğrenim Türü', 'Örgün Öğretim');
        addInfoRow('Durumu', student.user.is_active ? 'Aktif' : 'Pasif');
        addInfoRow('Kayıt Tarihi', new Date(student.enrollment_date).toLocaleDateString('tr-TR'));
        addInfoRow('Genel Not Ortalaması', student.cgpa || '0.00');

        doc.moveDown(3);

        // Body Text
        doc.text(
            `Yukarıda kimlik bilgileri yer alan ${tr(student.user.first_name)} ${tr(student.user.last_name)}, üniversitemizin kayıtlı öğrencisidir. ` +
            `Bu belge, ilgili makama sunulmak üzere, öğrencinin isteği üzerine düzenlenmiştir.`,
            { align: 'justify' }
        );

        doc.moveDown(4);

        // Signature section
        const signatureY = doc.y;

        // QR Code area (Mock)
        doc.rect(50, signatureY, 80, 80).stroke();
        doc.fontSize(8).text('Doğrulama Kodu', 60, signatureY + 35);

        // Registrar Signature
        doc.fontSize(12).text('Öğrenci İşleri Daire Başkanlığı', 350, signatureY, { align: 'center', width: 200 });
        doc.moveDown();
        doc.text('(İmza - Kaşe)', 350, doc.y, { align: 'center', width: 200 });

        // Footer
        const bottom = doc.page.height - 50;
        doc.fontSize(8).text('Bu belge elektronik ortamda üretilmiştir.', 50, bottom, { align: 'center', width: 500 });

        // Finalize
        doc.end();

    } catch (error) {
        logger.error('Certificate generation error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Belge oluşturulurken hata oluştu'
            });
        }
    }
};

module.exports = {
    generateCertificate
};
