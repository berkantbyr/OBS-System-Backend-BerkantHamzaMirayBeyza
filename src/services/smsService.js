/**
 * SMS Service Configuration
 * 
 * Supports multiple providers: Twilio, Vonage (Nexmo), AWS SNS
 * 
 * Setup Instructions:
 * 1. Choose a provider and sign up
 * 2. Set environment variables for your provider
 * 3. Configure SMS_PROVIDER in .env
 * 
 * Twilio: SMS_PROVIDER=twilio, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 * Vonage: SMS_PROVIDER=vonage, VONAGE_API_KEY, VONAGE_API_SECRET, VONAGE_PHONE_NUMBER
 * AWS SNS: SMS_PROVIDER=aws, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 */

const logger = require('../utils/logger');

let smsClient = null;
let provider = null;
let isInitialized = false;

/**
 * Initialize SMS Service
 */
const initSmsService = async () => {
    provider = process.env.SMS_PROVIDER?.toLowerCase();

    if (!provider) {
        logger.warn('⚠️ SMS_PROVIDER not set - SMS service disabled');
        return false;
    }

    try {
        switch (provider) {
            case 'twilio':
                await initTwilio();
                break;
            case 'vonage':
            case 'nexmo':
                await initVonage();
                break;
            case 'aws':
            case 'sns':
                await initAwsSns();
                break;
            case 'mock':
                initMock();
                break;
            default:
                logger.error(`Unknown SMS provider: ${provider}`);
                return false;
        }

        isInitialized = true;
        logger.info(`✅ SMS service initialized (provider: ${provider})`);
        return true;
    } catch (error) {
        logger.error('Failed to initialize SMS service:', error.message);
        return false;
    }
};

/**
 * Initialize Twilio
 */
const initTwilio = async () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
        throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN required');
    }

    const twilio = require('twilio');
    smsClient = twilio(accountSid, authToken);
};

/**
 * Initialize Vonage (Nexmo)
 */
const initVonage = async () => {
    const apiKey = process.env.VONAGE_API_KEY;
    const apiSecret = process.env.VONAGE_API_SECRET;

    if (!apiKey || !apiSecret) {
        throw new Error('VONAGE_API_KEY and VONAGE_API_SECRET required');
    }

    const { Vonage } = require('@vonage/server-sdk');
    smsClient = new Vonage({ apiKey, apiSecret });
};

/**
 * Initialize AWS SNS
 */
const initAwsSns = async () => {
    const { SNSClient } = require('@aws-sdk/client-sns');

    smsClient = new SNSClient({
        region: process.env.AWS_REGION || 'us-east-1',
    });
};

/**
 * Initialize Mock provider (for testing)
 */
const initMock = () => {
    smsClient = {
        send: async (to, message) => {
            logger.info(`[MOCK SMS] To: ${to}, Message: ${message}`);
            return { success: true, messageId: `mock-${Date.now()}` };
        }
    };
};

/**
 * Send SMS
 * @param {string} to - Phone number (E.164 format: +905551234567)
 * @param {string} message - SMS message content
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendSms = async (to, message) => {
    if (!isInitialized) {
        logger.warn('SMS service not initialized');
        return { success: false, error: 'SMS service not initialized' };
    }

    // Validate phone number format
    if (!to.match(/^\+?[1-9]\d{9,14}$/)) {
        return { success: false, error: 'Invalid phone number format' };
    }

    // Ensure E.164 format
    const phoneNumber = to.startsWith('+') ? to : `+${to}`;

    try {
        let result;

        switch (provider) {
            case 'twilio':
                result = await sendViaTwilio(phoneNumber, message);
                break;
            case 'vonage':
            case 'nexmo':
                result = await sendViaVonage(phoneNumber, message);
                break;
            case 'aws':
            case 'sns':
                result = await sendViaAwsSns(phoneNumber, message);
                break;
            case 'mock':
                result = await smsClient.send(phoneNumber, message);
                break;
            default:
                return { success: false, error: 'Unknown provider' };
        }

        logger.info(`SMS sent to ${phoneNumber.slice(0, -4)}****`);
        return result;
    } catch (error) {
        logger.error('SMS send error:', error.message);
        return { success: false, error: error.message };
    }
};

/**
 * Send via Twilio
 */
const sendViaTwilio = async (to, message) => {
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    const result = await smsClient.messages.create({
        body: message,
        from: fromNumber,
        to: to,
    });

    return { success: true, messageId: result.sid };
};

/**
 * Send via Vonage
 */
const sendViaVonage = async (to, message) => {
    const fromNumber = process.env.VONAGE_PHONE_NUMBER || 'CampusOBS';

    return new Promise((resolve, reject) => {
        smsClient.sms.send(
            { to, from: fromNumber, text: message },
            (err, responseData) => {
                if (err) {
                    reject(err);
                } else if (responseData.messages[0].status === '0') {
                    resolve({ success: true, messageId: responseData.messages[0]['message-id'] });
                } else {
                    reject(new Error(responseData.messages[0]['error-text']));
                }
            }
        );
    });
};

/**
 * Send via AWS SNS
 */
const sendViaAwsSns = async (to, message) => {
    const { PublishCommand } = require('@aws-sdk/client-sns');

    const command = new PublishCommand({
        PhoneNumber: to,
        Message: message,
        MessageAttributes: {
            'AWS.SNS.SMS.SenderID': {
                DataType: 'String',
                StringValue: 'CampusOBS'
            },
            'AWS.SNS.SMS.SMSType': {
                DataType: 'String',
                StringValue: 'Transactional'
            }
        }
    });

    const result = await smsClient.send(command);
    return { success: true, messageId: result.MessageId };
};

/**
 * Send notification SMS (formatted for notifications)
 * @param {string} to - Phone number
 * @param {string} type - Notification type
 * @param {Object} data - Notification data
 */
const sendNotificationSms = async (to, type, data = {}) => {
    const templates = {
        attendance_warning: `⚠️ Dikkat: ${data.courseName} dersine devam durumunuz kritik seviyede. Lütfen devam durumunuzu kontrol edin.`,
        payment_reminder: `💳 Ödeme hatırlatması: ${data.amount} TL tutarında ödemeniz bulunmaktadır. Son tarih: ${data.dueDate}`,
        event_reminder: `📅 Etkinlik hatırlatması: "${data.eventName}" ${data.time} tarihinde başlayacak.`,
        meal_reminder: `🍽️ Yemek hatırlatması: ${data.mealType} için rezervasyonunuz ${data.time} saatinde.`,
        grade_posted: `📊 Not açıklandı: ${data.courseName} dersi için notunuz yayınlandı.`,
        system: `📢 Kampüs OBS: ${data.message}`,
    };

    const message = templates[type] || data.message || 'Kampüs OBS bildirimi';
    return sendSms(to, message);
};

/**
 * Check if SMS service is available
 */
const isAvailable = () => isInitialized;

/**
 * Get current provider info
 */
const getProviderInfo = () => ({
    provider,
    isInitialized,
});

module.exports = {
    initSmsService,
    sendSms,
    sendNotificationSms,
    isAvailable,
    getProviderInfo,
};
