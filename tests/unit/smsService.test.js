/**
 * SMS Service Tests
 */

const smsService = require('../../src/services/smsService');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

describe('SMS Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('isAvailable', () => {
        it('should return false when not initialized', () => {
            expect(smsService.isAvailable()).toBe(false);
        });
    });

    describe('getProviderInfo', () => {
        it('should return provider info', () => {
            const info = smsService.getProviderInfo();
            expect(info).toHaveProperty('provider');
            expect(info).toHaveProperty('isInitialized');
        });
    });

    describe('sendSms', () => {
        it('should return error when service not initialized', async () => {
            const result = await smsService.sendSms('+905551234567', 'Test message');
            expect(result.success).toBe(false);
            expect(result.error).toBe('SMS service not initialized');
        });
    });

    describe('sendNotificationSms', () => {
        it('should handle attendance_warning type', async () => {
            const result = await smsService.sendNotificationSms(
                '+905551234567',
                'attendance_warning',
                { courseName: 'Test Course' }
            );
            expect(result.success).toBe(false); // Not initialized
        });

        it('should handle payment_reminder type', async () => {
            const result = await smsService.sendNotificationSms(
                '+905551234567',
                'payment_reminder',
                { amount: 100, dueDate: '2024-01-15' }
            );
            expect(result.success).toBe(false);
        });

        it('should handle event_reminder type', async () => {
            const result = await smsService.sendNotificationSms(
                '+905551234567',
                'event_reminder',
                { eventName: 'Conference', time: '14:00' }
            );
            expect(result.success).toBe(false);
        });
    });
});
