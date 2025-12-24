/**
 * New Relic APM Tests
 */

const newrelic = require('../../src/config/newrelic');

// Mock logger
jest.mock('../../src/utils/logger', () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
}));

describe('New Relic Configuration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('isAvailable', () => {
        it('should return false when not initialized', () => {
            expect(newrelic.isAvailable()).toBe(false);
        });
    });

    describe('recordCustomEvent', () => {
        it('should not throw when not initialized', () => {
            expect(() => {
                newrelic.recordCustomEvent('TestEvent', { key: 'value' });
            }).not.toThrow();
        });
    });

    describe('addCustomAttributes', () => {
        it('should not throw when not initialized', () => {
            expect(() => {
                newrelic.addCustomAttributes({ userId: 1 });
            }).not.toThrow();
        });
    });

    describe('setTransactionName', () => {
        it('should not throw when not initialized', () => {
            expect(() => {
                newrelic.setTransactionName('TestTransaction');
            }).not.toThrow();
        });
    });

    describe('noticeError', () => {
        it('should not throw when not initialized', () => {
            expect(() => {
                newrelic.noticeError(new Error('Test error'));
            }).not.toThrow();
        });
    });

    describe('startWebTransaction', () => {
        it('should execute handler when not initialized', () => {
            const handler = jest.fn(() => 'result');
            const result = newrelic.startWebTransaction('test', handler);
            expect(handler).toHaveBeenCalled();
            expect(result).toBe('result');
        });
    });

    describe('startBackgroundTransaction', () => {
        it('should execute handler when not initialized', () => {
            const handler = jest.fn(() => 'result');
            const result = newrelic.startBackgroundTransaction('test', 'group', handler);
            expect(handler).toHaveBeenCalled();
            expect(result).toBe('result');
        });
    });

    describe('getBrowserTimingHeader', () => {
        it('should return empty string when not initialized', () => {
            const header = newrelic.getBrowserTimingHeader();
            expect(header).toBe('');
        });
    });

    describe('newRelicMiddleware', () => {
        it('should call next', () => {
            const mockReq = { user: { id: 1, role: 'admin', email: 'test@test.com' } };
            const mockRes = {};
            const mockNext = jest.fn();

            newrelic.newRelicMiddleware(mockReq, mockRes, mockNext);
            expect(mockNext).toHaveBeenCalled();
        });
    });
});
