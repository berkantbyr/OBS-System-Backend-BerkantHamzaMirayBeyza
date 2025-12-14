const userController = require('../../src/controllers/userController');
const userService = require('../../src/services/userService');
// require('../../src/models') is mocked below

// Mock dependencies
jest.mock('../../src/services/userService');
jest.mock('../../src/models', () => {
    // Standard Jest Mock without sequelize-mock
    const mockFuncs = {
        findAll: jest.fn(),
        findOne: jest.fn(),
        findByPk: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
        count: jest.fn()
    };

    return {
        User: { ...mockFuncs },
        Course: { ...mockFuncs },
        CourseSection: { ...mockFuncs },
        Department: { ...mockFuncs },
        Faculty: { ...mockFuncs },
        Student: { ...mockFuncs },
        Classroom: { ...mockFuncs },
        AttendanceSession: { ...mockFuncs },
        sequelize: {
            transaction: jest.fn(callback => callback ? callback() : Promise.resolve())
        }
    };
});

// Mock Response
const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

// Mock Request
const mockRequest = (body = {}, user = {}, params = {}, query = {}) => ({
    body,
    user,
    params,
    query
});

describe('UserController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getProfile', () => {
        it('should return user profile successfully', async () => {
            const req = mockRequest({}, { id: 'user-123' });
            const res = mockResponse();

            const mockProfile = { id: 'user-123', email: 'test@test.com' };
            userService.getProfile.mockResolvedValue(mockProfile);

            await userController.getProfile(req, res);

            expect(userService.getProfile).toHaveBeenCalledWith('user-123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                data: mockProfile
            });
        });

        it('should handle errors', async () => {
            const req = mockRequest({}, { id: 'user-123' });
            const res = mockResponse();

            userService.getProfile.mockRejectedValue(new Error('Profile error'));

            await userController.getProfile(req, res);

            // Based on observed behavior, controller returns 404 on error
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('updateProfile', () => {
        it('should update profile successfully', async () => {
            const req = mockRequest({ phone: '123' }, { id: 'user-1' });
            const res = mockResponse();

            userService.updateProfile.mockResolvedValue({ id: 'user-1', phone: '123' });

            await userController.updateProfile(req, res);

            expect(userService.updateProfile).toHaveBeenCalledWith('user-1', { phone: '123' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Profil güncellendi',
                data: expect.anything()
            });
        });

        it('should handle errors', async () => {
            const req = mockRequest({}, { id: 'u-1' });
            const res = mockResponse();
            userService.updateProfile.mockRejectedValue(new Error('Update failed'));

            await userController.updateProfile(req, res);

            // Based on observed behavior, controller returns 400 on update error
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            const req = mockRequest(
                { old_password: 'old', new_password: 'new' },
                { id: 'u-1' }
            );
            const res = mockResponse();

            // Should resolve with an object containing message
            userService.changePassword.mockResolvedValue({ message: 'Şifre başarıyla değiştirildi' });

            await userController.changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                success: true,
                message: 'Şifre başarıyla değiştirildi'
            });
        });
    });

    describe('getAllFaculty', () => {
        it('should return list of faculty members', async () => {
            const req = mockRequest();
            const res = mockResponse();

            // Now Faculty model is properly mocked
            const { Faculty } = require('../../src/models');
            Faculty.findAll.mockResolvedValue([
                {
                    id: 1, user_id: 1, title: 'Prof',
                    user: { first_name: 'A', last_name: 'B', email: 'e' },
                    department: { name: 'D', code: 'C' }
                }
            ]);

            await userController.getAllFaculty(req, res);

            // Controller uses res.json() directly without res.status(200)
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                data: expect.any(Array)
            }));
        });
    });
});
