const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/models');
const { User, Student, Faculty, Course, CourseSection, Enrollment, AttendanceSession, AttendanceRecord } = db;
const bcrypt = require('bcrypt');

describe('Full Academic Flow Integration Test', () => {
    let adminToken, facultyToken, studentToken;
    let semesterId = 'FALL2024';
    let courseId, sectionId, enrollmentId, sessionId;
    let studentId, facultyId;

    // Helper to clear DB
    const clearDb = async () => {
        await AttendanceRecord.destroy({ where: {}, force: true });
        await AttendanceSession.destroy({ where: {}, force: true });
        await Enrollment.destroy({ where: {}, force: true });
        await CourseSection.destroy({ where: {}, force: true });
        await Course.destroy({ where: {}, force: true });
        await Student.destroy({ where: {}, force: true });
        await Faculty.destroy({ where: {}, force: true });
        await User.destroy({ where: {}, force: true });
    };

    beforeAll(async () => {
        // Mock DB connection if tested in isolation, or assume test DB is ready.
        // For this large integration test, we ideally want a real DB connection.
        // Assuming the app connects to a test DB based on NODE_ENV=test

        // Setup initial users
        await clearDb(); // Force clear

        // 1. Create Admin
        const adminUser = await User.create({
            first_name: 'Admin', last_name: 'User', email: 'admin@test.com',
            password: await bcrypt.hash('123456', 10), role: 'admin', is_verified: true
        });

        const loginRes = await request(app).post('/api/v1/auth/login').send({ email: 'admin@test.com', password: '123456' });
        adminToken = loginRes.body.data.token;

        // 2. Create Faculty
        const facUser = await User.create({
            first_name: 'Fac', last_name: 'Ulty', email: 'faculty@test.com',
            password: await bcrypt.hash('123456', 10), role: 'faculty', is_verified: true
        });
        const faculty = await Faculty.create({ user_id: facUser.id, title: 'Prof', department_id: 1 });
        facultyId = faculty.id;

        const facLogin = await request(app).post('/api/v1/auth/login').send({ email: 'faculty@test.com', password: '123456' });
        facultyToken = facLogin.body.data.token;

        // 3. Create Student
        const stuUser = await User.create({
            first_name: 'Stu', last_name: 'Dent', email: 'student@test.com',
            password: await bcrypt.hash('123456', 10), role: 'student', is_verified: true
        });
        const student = await Student.create({
            user_id: stuUser.id, student_number: '1001', grade: 1, department_id: 1, enrollment_date: new Date()
        });
        studentId = student.id;

        const stuLogin = await request(app).post('/api/v1/auth/login').send({ email: 'student@test.com', password: '123456' });
        studentToken = stuLogin.body.data.token;
    });

    afterAll(async () => {
        await clearDb();
        await db.sequelize.close(); // Close connection
    });

    describe('1. Course & Section Management (Admin)', () => {
        it('should create a new course', async () => {
            const res = await request(app)
                .post('/api/v1/courses')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    code: 'CSE101', name: 'Intro to CS', description: 'Basic CS',
                    credits: 3, ects: 5, department_id: 1, semester: 1
                });
            expect(res.status).toBe(201);
            courseId = res.body.data.id;
        });

        it('should create a section for the course', async () => {
            const res = await request(app)
                .post('/api/v1/sections')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    course_id: courseId, semester: 'fall', year: 2024, capacity: 50,
                    schedule: JSON.stringify([{ day: 'Monday', start_time: '09:00', end_time: '12:00' }])
                });
            expect(res.status).toBe(201);
            sectionId = res.body.data.id;
        });

        it('should assign faculty to the section', async () => {
            const res = await request(app)
                .put(`/api/v1/sections/${sectionId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ instructor_id: facultyId });
            expect(res.status).toBe(200);
            expect(res.body.data.instructor_id).toBe(facultyId);
        });
    });

    describe('2. Enrollment Process (Student)', () => {
        it('should search for available sections', async () => {
            const res = await request(app)
                .get('/api/v1/sections?semester=fall&year=2024')
                .set('Authorization', `Bearer ${studentToken}`);
            expect(res.status).toBe(200);
            expect(res.body.data.length).toBeGreaterThan(0);
        });

        it('should enroll in the section', async () => {
            const res = await request(app)
                .post('/api/v1/enrollments')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ section_id: sectionId });

            expect(res.status).toBe(201);
            enrollmentId = res.body.data.id;
        });

        it('should verify enrollment appears in my-courses', async () => {
            const res = await request(app)
                .get('/api/v1/enrollments/my-courses')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(res.status).toBe(200);
            const myCourse = res.body.data.find(c => c.id === enrollmentId);
            expect(myCourse).toBeDefined();
            expect(myCourse.section.course.code).toBe('CSE101');
        });
    });

    describe('3. Attendance Flow (Faculty & Student)', () => {
        it('should allow faculty to create attendance session', async () => {
            // Mock date to match Monday 09:00 if needed by logic, but service might bypass day check for session creation unless strict
            const res = await request(app)
                .post('/api/v1/attendance/sessions')
                .set('Authorization', `Bearer ${facultyToken}`)
                .send({
                    section_id: sectionId,
                    date: new Date().toISOString().split('T')[0],
                    start_time: '09:00',
                    duration_minutes: 60,
                    qr_refresh_seconds: 5,
                    geofence_radius: 50,
                    latitude: 41.0, longitude: 29.0
                });
            expect(res.status).toBe(201);
            sessionId = res.body.data.id;
        });

        it('should fail check-in if too far (Mock GPS)', async () => {
            const res = await request(app)
                .post('/api/v1/attendance/check-in')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    session_id: sessionId,
                    latitude: 42.0, // Far away
                    longitude: 29.0
                });
            expect(res.status).toBe(400); // Or whatever error code (400/403)
        });

        it('should succeed check-in with correct location', async () => {
            const res = await request(app)
                .post('/api/v1/attendance/check-in')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    session_id: sessionId,
                    latitude: 41.0001, // Close enough
                    longitude: 29.0001
                });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should show updated attendance stats to student', async () => {
            const res = await request(app)
                .get(`/api/v1/attendance/stats/${sectionId}`)
                .set('Authorization', `Bearer ${studentToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.present).toBe(1);
        });
    });

    describe('4. Grading Flow (Faculty & Student)', () => {
        it('should allow faculty to enter grades', async () => {
            const res = await request(app)
                .post('/api/v1/grades')
                .set('Authorization', `Bearer ${facultyToken}`)
                .send({
                    enrollment_id: enrollmentId,
                    midterm: 80,
                    final: 90,
                    homework: 100
                });
            expect(res.status).toBe(200);
        });

        it('should show grades to student', async () => {
            const res = await request(app)
                .get('/api/v1/grades/my-grades')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(res.status).toBe(200);
            const gradeData = res.body.data.grades.find(g => g.enrollmentId === enrollmentId);
            expect(gradeData.grades.midterm).toBe(80);
            expect(gradeData.grades.final).toBe(90);
            expect(gradeData.grades.letterGrade).toBeDefined(); // AA/BA etc
        });

        it('should generate transcript data', async () => {
            const res = await request(app)
                .get('/api/v1/grades/transcript')
                .set('Authorization', `Bearer ${studentToken}`);

            expect(res.status).toBe(200);
            expect(res.body.data.academic.cgpa).toBeGreaterThan(0);
        });
    });
});
