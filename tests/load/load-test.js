import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginDuration = new Trend('login_duration');
const dashboardDuration = new Trend('dashboard_duration');
const courseDuration = new Trend('course_duration');

// Test configuration
export const options = {
    // Ramp up/down pattern
    stages: [
        { duration: '30s', target: 20 },   // Ramp up to 20 users
        { duration: '1m', target: 50 },    // Ramp up to 50 users
        { duration: '2m', target: 50 },    // Stay at 50 users
        { duration: '30s', target: 100 },  // Spike to 100 users
        { duration: '1m', target: 100 },   // Stay at 100 users
        { duration: '30s', target: 0 },    // Ramp down
    ],

    // Thresholds for pass/fail
    thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests under 500ms
        http_req_failed: ['rate<0.01'],                  // Error rate under 1%
        errors: ['rate<0.05'],                           // Custom error rate under 5%
    },

    // Tags for grouping results
    tags: {
        environment: __ENV.ENVIRONMENT || 'staging',
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Test data
const TEST_CREDENTIALS = {
    email: __ENV.TEST_EMAIL || 'test@example.com',
    password: __ENV.TEST_PASSWORD || 'test123',
};

// Helper function to make authenticated requests
function authHeader(token) {
    return { Authorization: `Bearer ${token}` };
}

// Setup function - runs once per VU
export function setup() {
    // Health check
    const healthRes = http.get(`${BASE_URL}/api/health`);
    if (healthRes.status !== 200) {
        console.error('Health check failed!');
    }
    return {};
}

// Main test scenario
export default function () {
    let token = null;

    // Test Group 1: Login
    group('Login Flow', () => {
        const start = Date.now();

        const loginRes = http.post(
            `${BASE_URL}/api/v1/auth/login`,
            JSON.stringify(TEST_CREDENTIALS),
            { headers: { 'Content-Type': 'application/json' } }
        );

        loginDuration.add(Date.now() - start);

        const success = check(loginRes, {
            'login status is 200': (r) => r.status === 200,
            'login has token': (r) => r.json('data.token') !== undefined,
        });

        errorRate.add(!success);

        if (success) {
            token = loginRes.json('data.token');
        }
    });

    sleep(1);

    // Test Group 2: Dashboard API
    if (token) {
        group('Dashboard API', () => {
            const start = Date.now();

            const dashboardRes = http.get(
                `${BASE_URL}/api/v1/dashboard`,
                { headers: authHeader(token) }
            );

            dashboardDuration.add(Date.now() - start);

            const success = check(dashboardRes, {
                'dashboard status is 200': (r) => r.status === 200,
                'dashboard has data': (r) => r.json('data') !== undefined,
            });

            errorRate.add(!success);
        });

        sleep(0.5);

        // Test Group 3: Courses List
        group('Courses API', () => {
            const start = Date.now();

            const coursesRes = http.get(
                `${BASE_URL}/api/v1/courses`,
                { headers: authHeader(token) }
            );

            courseDuration.add(Date.now() - start);

            const success = check(coursesRes, {
                'courses status is 200': (r) => r.status === 200,
                'courses is array': (r) => Array.isArray(r.json('data.courses') || r.json('data')),
            });

            errorRate.add(!success);
        });

        sleep(0.5);

        // Test Group 4: Analytics (admin only - may fail for non-admin users)
        group('Analytics API', () => {
            const analyticsRes = http.get(
                `${BASE_URL}/api/v1/analytics/dashboard`,
                { headers: authHeader(token) }
            );

            // Analytics might be admin-only, so 401/403 is acceptable
            check(analyticsRes, {
                'analytics endpoint responds': (r) => [200, 401, 403].includes(r.status),
            });
        });

        sleep(0.5);

        // Test Group 5: Notifications
        group('Notifications API', () => {
            const notifRes = http.get(
                `${BASE_URL}/api/v1/notifications`,
                { headers: authHeader(token) }
            );

            check(notifRes, {
                'notifications status is 200': (r) => r.status === 200,
            });
        });
    }

    sleep(1);
}

// Teardown function - runs once after all VUs complete
export function teardown(data) {
    console.log('Load test completed');
}
