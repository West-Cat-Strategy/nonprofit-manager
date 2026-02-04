"use strict";
/**
 * Webhook Service
 * Handles outgoing webhook delivery and management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWebhookUrl = validateWebhookUrl;
exports.createWebhookEndpoint = createWebhookEndpoint;
exports.getWebhookEndpoints = getWebhookEndpoints;
exports.getWebhookEndpoint = getWebhookEndpoint;
exports.updateWebhookEndpoint = updateWebhookEndpoint;
exports.deleteWebhookEndpoint = deleteWebhookEndpoint;
exports.regenerateWebhookSecret = regenerateWebhookSecret;
exports.getWebhookDeliveries = getWebhookDeliveries;
exports.triggerWebhooks = triggerWebhooks;
exports.processRetries = processRetries;
exports.testWebhookEndpoint = testWebhookEndpoint;
exports.getAvailableWebhookEvents = getAvailableWebhookEvents;
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("dns/promises"));
const net_1 = __importDefault(require("net"));
const database_1 = __importDefault(require("../config/database"));
const logger_1 = require("../config/logger");
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAYS = [60, 300, 900, 3600, 7200]; // seconds: 1m, 5m, 15m, 1h, 2h
const WEBHOOK_TIMEOUT = 30000; // 30 seconds
const PRIVATE_HOSTNAME_SUFFIXES = ['.localhost', '.local'];
const BLOCKED_HOSTNAMES = new Set(['localhost']);
const isPrivateIpv4 = (ip) => {
    const parts = ip.split('.').map((part) => parseInt(part, 10));
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part)))
        return false;
    const [a, b] = parts;
    if (a === 10)
        return true;
    if (a === 127)
        return true;
    if (a === 169 && b === 254)
        return true;
    if (a === 172 && b >= 16 && b <= 31)
        return true;
    if (a === 192 && b === 168)
        return true;
    if (a === 0)
        return true;
    if (a === 100 && b >= 64 && b <= 127)
        return true; // CGNAT
    if (a === 198 && (b === 18 || b === 19))
        return true; // benchmark
    if (a >= 224)
        return true; // multicast/reserved
    return false;
};
const isPrivateIpv6 = (ip) => {
    const normalized = ip.toLowerCase();
    if (normalized === '::' || normalized === '::1')
        return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd'))
        return true; // fc00::/7
    if (normalized.startsWith('fe80'))
        return true; // link-local
    if (normalized.startsWith('2001:db8'))
        return true; // documentation
    if (normalized.startsWith('::ffff:')) {
        const ipv4 = normalized.replace('::ffff:', '');
        return isPrivateIpv4(ipv4);
    }
    return false;
};
const isPrivateHost = (hostname) => {
    const lower = hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.has(lower))
        return true;
    if (PRIVATE_HOSTNAME_SUFFIXES.some((suffix) => lower.endsWith(suffix)))
        return true;
    return false;
};
const isPrivateIp = (ip) => {
    const ipVersion = net_1.default.isIP(ip);
    if (ipVersion === 4)
        return isPrivateIpv4(ip);
    if (ipVersion === 6)
        return isPrivateIpv6(ip);
    return false;
};
async function validateWebhookUrl(url) {
    let parsed;
    try {
        parsed = new URL(url);
    }
    catch {
        return { ok: false, reason: 'Invalid URL' };
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { ok: false, reason: 'Only http and https URLs are allowed' };
    }
    if (parsed.username || parsed.password) {
        return { ok: false, reason: 'URL must not include credentials' };
    }
    const hostname = parsed.hostname;
    if (!hostname) {
        return { ok: false, reason: 'URL must include a hostname' };
    }
    if (isPrivateHost(hostname)) {
        return { ok: false, reason: 'Host is not allowed' };
    }
    if (net_1.default.isIP(hostname)) {
        if (isPrivateIp(hostname)) {
            return { ok: false, reason: 'IP address is not allowed' };
        }
        return { ok: true };
    }
    try {
        const addresses = await promises_1.default.lookup(hostname, { all: true, verbatim: true });
        if (addresses.length === 0) {
            return { ok: false, reason: 'Hostname did not resolve' };
        }
        for (const addr of addresses) {
            if (isPrivateIp(addr.address)) {
                return { ok: false, reason: 'Hostname resolves to a private IP' };
            }
        }
    }
    catch {
        return { ok: false, reason: 'Hostname resolution failed' };
    }
    return { ok: true };
}
/**
 * Generate a secure webhook secret
 */
function generateWebhookSecret() {
    return `whsec_${crypto_1.default.randomBytes(32).toString('hex')}`;
}
/**
 * Sign a webhook payload with HMAC-SHA256
 */
function signPayload(payload, secret) {
    const timestamp = Math.floor(Date.now() / 1000);
    const signaturePayload = `${timestamp}.${payload}`;
    const signature = crypto_1.default
        .createHmac('sha256', secret)
        .update(signaturePayload)
        .digest('hex');
    return `t=${timestamp},v1=${signature}`;
}
/**
 * Create a new webhook endpoint
 */
async function createWebhookEndpoint(userId, data) {
    const secret = generateWebhookSecret();
    const result = await database_1.default.query(`INSERT INTO webhook_endpoints (user_id, url, description, secret, events, is_active)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING *`, [userId, data.url, data.description || null, secret, JSON.stringify(data.events)]);
    const row = result.rows[0];
    return mapRowToEndpoint(row);
}
/**
 * Get all webhook endpoints for a user
 */
async function getWebhookEndpoints(userId) {
    const result = await database_1.default.query(`SELECT
       we.*,
       COUNT(wd.id) as total_deliveries,
       COUNT(CASE WHEN wd.status = 'success' THEN 1 END) as successful_deliveries,
       COUNT(CASE WHEN wd.status = 'failed' THEN 1 END) as failed_deliveries
     FROM webhook_endpoints we
     LEFT JOIN webhook_deliveries wd ON we.id = wd.webhook_endpoint_id
     WHERE we.user_id = $1
     GROUP BY we.id
     ORDER BY we.created_at DESC`, [userId]);
    return result.rows.map((row) => ({
        ...mapRowToEndpoint(row),
        totalDeliveries: parseInt(row.total_deliveries) || 0,
        successfulDeliveries: parseInt(row.successful_deliveries) || 0,
        failedDeliveries: parseInt(row.failed_deliveries) || 0,
        successRate: parseInt(row.total_deliveries) > 0
            ? (parseInt(row.successful_deliveries) / parseInt(row.total_deliveries)) * 100
            : 100,
    }));
}
/**
 * Get a specific webhook endpoint
 */
async function getWebhookEndpoint(endpointId, userId) {
    const result = await database_1.default.query('SELECT * FROM webhook_endpoints WHERE id = $1 AND user_id = $2', [endpointId, userId]);
    if (result.rows.length === 0) {
        return null;
    }
    return mapRowToEndpoint(result.rows[0]);
}
/**
 * Update a webhook endpoint
 */
async function updateWebhookEndpoint(endpointId, userId, data) {
    const updates = [];
    const values = [];
    let paramIndex = 1;
    if (data.url !== undefined) {
        updates.push(`url = $${paramIndex++}`);
        values.push(data.url);
    }
    if (data.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(data.description);
    }
    if (data.events !== undefined) {
        updates.push(`events = $${paramIndex++}`);
        values.push(JSON.stringify(data.events));
    }
    if (data.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(data.isActive);
    }
    if (updates.length === 0) {
        return getWebhookEndpoint(endpointId, userId);
    }
    updates.push(`updated_at = NOW()`);
    values.push(endpointId, userId);
    const result = await database_1.default.query(`UPDATE webhook_endpoints
     SET ${updates.join(', ')}
     WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
     RETURNING *`, values);
    if (result.rows.length === 0) {
        return null;
    }
    return mapRowToEndpoint(result.rows[0]);
}
/**
 * Delete a webhook endpoint
 */
async function deleteWebhookEndpoint(endpointId, userId) {
    const result = await database_1.default.query('DELETE FROM webhook_endpoints WHERE id = $1 AND user_id = $2', [endpointId, userId]);
    return (result.rowCount ?? 0) > 0;
}
/**
 * Regenerate webhook secret
 */
async function regenerateWebhookSecret(endpointId, userId) {
    const secret = generateWebhookSecret();
    const result = await database_1.default.query(`UPDATE webhook_endpoints
     SET secret = $1, updated_at = NOW()
     WHERE id = $2 AND user_id = $3
     RETURNING secret`, [secret, endpointId, userId]);
    if (result.rows.length === 0) {
        return null;
    }
    return result.rows[0].secret;
}
/**
 * Get webhook deliveries for an endpoint
 */
async function getWebhookDeliveries(endpointId, userId, limit = 50) {
    // First verify the endpoint belongs to the user
    const endpoint = await getWebhookEndpoint(endpointId, userId);
    if (!endpoint) {
        return [];
    }
    const result = await database_1.default.query(`SELECT * FROM webhook_deliveries
     WHERE webhook_endpoint_id = $1
     ORDER BY created_at DESC
     LIMIT $2`, [endpointId, limit]);
    return result.rows.map(mapRowToDelivery);
}
/**
 * Trigger webhooks for an event
 * This should be called when events occur in the system
 */
async function triggerWebhooks(eventType, data, previousAttributes) {
    try {
        // Find all active endpoints subscribed to this event type
        const result = await database_1.default.query(`SELECT * FROM webhook_endpoints
       WHERE is_active = true
       AND events @> $1::jsonb`, [JSON.stringify([eventType])]);
        const endpoints = result.rows.map(mapRowToEndpoint);
        // Create webhook payload
        const payload = {
            id: crypto_1.default.randomUUID(),
            type: eventType,
            createdAt: new Date().toISOString(),
            data: {
                object: data,
                ...(previousAttributes ? { previousAttributes } : {}),
            },
        };
        // Deliver to each endpoint
        const deliveryPromises = endpoints.map((endpoint) => deliverWebhook(endpoint, payload));
        await Promise.allSettled(deliveryPromises);
    }
    catch (error) {
        logger_1.logger.error('Error triggering webhooks', { eventType, error });
    }
}
/**
 * Deliver a webhook to an endpoint
 */
async function deliverWebhook(endpoint, payload) {
    const payloadString = JSON.stringify(payload);
    const signature = signPayload(payloadString, endpoint.secret);
    // Create delivery record
    const deliveryResult = await database_1.default.query(`INSERT INTO webhook_deliveries (webhook_endpoint_id, event_type, payload, status, attempts)
     VALUES ($1, $2, $3, 'pending', 0)
     RETURNING id`, [endpoint.id, payload.type, payload]);
    const deliveryId = deliveryResult.rows[0].id;
    try {
        const validation = await validateWebhookUrl(endpoint.url);
        if (!validation.ok) {
            await updateDeliveryStatus(deliveryId, 'failed', {
                responseBody: validation.reason || 'Webhook URL blocked',
                attempts: MAX_RETRY_ATTEMPTS,
            });
            await database_1.default.query(`UPDATE webhook_endpoints
         SET last_delivery_at = NOW(), last_delivery_status = 'failed'
         WHERE id = $1`, [endpoint.id]);
            return;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);
        const response = await fetch(endpoint.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature,
                'X-Webhook-Id': payload.id,
                'X-Webhook-Event': payload.type,
                'User-Agent': 'NonprofitManager-Webhook/1.0',
            },
            body: payloadString,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const responseBody = await response.text().catch(() => '');
        if (response.ok) {
            // Success
            await updateDeliveryStatus(deliveryId, 'success', {
                responseStatus: response.status,
                responseBody: responseBody.substring(0, 1000),
                deliveredAt: new Date(),
            });
            // Update endpoint last delivery info
            await database_1.default.query(`UPDATE webhook_endpoints
         SET last_delivery_at = NOW(), last_delivery_status = 'success'
         WHERE id = $1`, [endpoint.id]);
        }
        else {
            // HTTP error - schedule retry
            await handleDeliveryFailure(deliveryId, endpoint.id, response.status, responseBody);
        }
    }
    catch (error) {
        // Network error - schedule retry
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await handleDeliveryFailure(deliveryId, endpoint.id, undefined, errorMessage);
    }
}
/**
 * Handle delivery failure and schedule retry
 */
async function handleDeliveryFailure(deliveryId, endpointId, statusCode, responseBody) {
    const delivery = await database_1.default.query('SELECT attempts FROM webhook_deliveries WHERE id = $1', [deliveryId]);
    const attempts = (delivery.rows[0]?.attempts || 0) + 1;
    if (attempts >= MAX_RETRY_ATTEMPTS) {
        // Max retries exceeded
        await updateDeliveryStatus(deliveryId, 'failed', {
            responseStatus: statusCode,
            responseBody: responseBody?.substring(0, 1000),
            attempts,
        });
        await database_1.default.query(`UPDATE webhook_endpoints
       SET last_delivery_at = NOW(), last_delivery_status = 'failed'
       WHERE id = $1`, [endpointId]);
    }
    else {
        // Schedule retry
        const retryDelay = RETRY_DELAYS[attempts - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
        const nextRetryAt = new Date(Date.now() + retryDelay * 1000);
        await updateDeliveryStatus(deliveryId, 'retrying', {
            responseStatus: statusCode,
            responseBody: responseBody?.substring(0, 1000),
            attempts,
            nextRetryAt,
        });
    }
}
/**
 * Update delivery status
 */
async function updateDeliveryStatus(deliveryId, status, data) {
    await database_1.default.query(`UPDATE webhook_deliveries
     SET status = $1,
         response_status = COALESCE($2, response_status),
         response_body = COALESCE($3, response_body),
         delivered_at = COALESCE($4, delivered_at),
         attempts = COALESCE($5, attempts),
         next_retry_at = $6
     WHERE id = $7`, [
        status,
        data.responseStatus || null,
        data.responseBody || null,
        data.deliveredAt || null,
        data.attempts || null,
        data.nextRetryAt || null,
        deliveryId,
    ]);
}
/**
 * Process pending retries (should be called by a scheduler)
 */
async function processRetries() {
    const result = await database_1.default.query(`SELECT wd.*, we.url, we.secret
     FROM webhook_deliveries wd
     JOIN webhook_endpoints we ON wd.webhook_endpoint_id = we.id
     WHERE wd.status = 'retrying'
     AND wd.next_retry_at <= NOW()
     AND we.is_active = true
     LIMIT 100`);
    let processed = 0;
    for (const row of result.rows) {
        const endpoint = {
            id: row.webhook_endpoint_id,
            userId: row.user_id,
            url: row.url,
            secret: row.secret,
            events: [],
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const payload = row.payload;
        try {
            await deliverWebhook(endpoint, payload);
            processed++;
        }
        catch (error) {
            logger_1.logger.error('Error processing webhook retry', { deliveryId: row.id, error });
        }
    }
    return processed;
}
/**
 * Test a webhook endpoint with a test payload
 */
async function testWebhookEndpoint(endpointId, userId) {
    const endpoint = await getWebhookEndpoint(endpointId, userId);
    if (!endpoint) {
        return { success: false, error: 'Webhook endpoint not found' };
    }
    const testPayload = {
        id: crypto_1.default.randomUUID(),
        type: 'contact.created',
        createdAt: new Date().toISOString(),
        data: {
            object: {
                id: 'test_contact_123',
                first_name: 'Test',
                last_name: 'User',
                email: 'test@example.com',
                _test: true,
            },
        },
    };
    const payloadString = JSON.stringify(testPayload);
    const signature = signPayload(payloadString, endpoint.secret);
    const startTime = Date.now();
    try {
        const validation = await validateWebhookUrl(endpoint.url);
        if (!validation.ok) {
            return {
                success: false,
                responseTime: Date.now() - startTime,
                error: validation.reason || 'Webhook URL blocked',
            };
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT);
        const response = await fetch(endpoint.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': signature,
                'X-Webhook-Id': testPayload.id,
                'X-Webhook-Event': testPayload.type,
                'X-Webhook-Test': 'true',
                'User-Agent': 'NonprofitManager-Webhook/1.0',
            },
            body: payloadString,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        return {
            success: response.ok,
            statusCode: response.status,
            responseTime,
            error: response.ok ? undefined : `HTTP ${response.status}`,
        };
    }
    catch (error) {
        return {
            success: false,
            responseTime: Date.now() - startTime,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
/**
 * Get available webhook events
 */
function getAvailableWebhookEvents() {
    return [
        { type: 'contact.created', name: 'Contact Created', description: 'When a new contact is added', category: 'contact' },
        { type: 'contact.updated', name: 'Contact Updated', description: 'When a contact is modified', category: 'contact' },
        { type: 'contact.deleted', name: 'Contact Deleted', description: 'When a contact is removed', category: 'contact' },
        { type: 'donation.created', name: 'Donation Created', description: 'When a new donation is recorded', category: 'donation' },
        { type: 'donation.updated', name: 'Donation Updated', description: 'When a donation is modified', category: 'donation' },
        { type: 'donation.deleted', name: 'Donation Deleted', description: 'When a donation is removed', category: 'donation' },
        { type: 'event.created', name: 'Event Created', description: 'When a new event is created', category: 'event' },
        { type: 'event.updated', name: 'Event Updated', description: 'When an event is modified', category: 'event' },
        { type: 'event.deleted', name: 'Event Deleted', description: 'When an event is removed', category: 'event' },
        { type: 'event.registration.created', name: 'Event Registration', description: 'When someone registers for an event', category: 'event' },
        { type: 'event.registration.canceled', name: 'Registration Canceled', description: 'When a registration is canceled', category: 'event' },
        { type: 'volunteer.created', name: 'Volunteer Created', description: 'When a new volunteer is added', category: 'volunteer' },
        { type: 'volunteer.updated', name: 'Volunteer Updated', description: 'When a volunteer is modified', category: 'volunteer' },
        { type: 'volunteer.hours_logged', name: 'Hours Logged', description: 'When volunteer hours are recorded', category: 'volunteer' },
        { type: 'task.created', name: 'Task Created', description: 'When a new task is created', category: 'task' },
        { type: 'task.completed', name: 'Task Completed', description: 'When a task is marked complete', category: 'task' },
        { type: 'task.overdue', name: 'Task Overdue', description: 'When a task becomes overdue', category: 'task' },
        { type: 'payment.succeeded', name: 'Payment Succeeded', description: 'When a payment is successful', category: 'payment' },
        { type: 'payment.failed', name: 'Payment Failed', description: 'When a payment fails', category: 'payment' },
        { type: 'payment.refunded', name: 'Payment Refunded', description: 'When a payment is refunded', category: 'payment' },
    ];
}
/**
 * Map database row to WebhookEndpoint
 */
function mapRowToEndpoint(row) {
    return {
        id: row.id,
        userId: row.user_id,
        url: row.url,
        description: row.description,
        secret: row.secret,
        events: (typeof row.events === 'string' ? JSON.parse(row.events) : row.events),
        isActive: row.is_active,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        lastDeliveryAt: row.last_delivery_at ? new Date(row.last_delivery_at) : undefined,
        lastDeliveryStatus: row.last_delivery_status,
    };
}
/**
 * Map database row to WebhookDelivery
 */
function mapRowToDelivery(row) {
    return {
        id: row.id,
        webhookEndpointId: row.webhook_endpoint_id,
        eventType: row.event_type,
        payload: row.payload,
        responseStatus: row.response_status,
        responseBody: row.response_body,
        status: row.status,
        attempts: row.attempts,
        nextRetryAt: row.next_retry_at ? new Date(row.next_retry_at) : undefined,
        createdAt: new Date(row.created_at),
        deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
    };
}
exports.default = {
    createWebhookEndpoint,
    getWebhookEndpoints,
    getWebhookEndpoint,
    updateWebhookEndpoint,
    deleteWebhookEndpoint,
    regenerateWebhookSecret,
    getWebhookDeliveries,
    triggerWebhooks,
    processRetries,
    testWebhookEndpoint,
    getAvailableWebhookEvents,
};
//# sourceMappingURL=webhookService.js.map