const customMessages = {
    custom_message: { code: 200, message: 'custom message', statusCode: 200 },
};
/**
 * Push notification messages
 */
const notifications = {};

const builder = {
    wrong_credentials: (prefix) => builder.prepare(403, prefix, 'Invalid credentials'),
    unauthorized: (prefix) => builder.prepare(401, prefix, 'Authentication Error, Please try logging again'),
    invalid_req: (prefix) => builder.prepare(406, prefix, 'invalid Request'),
    wrong_otp: (prefix) => builder.prepare(403, prefix, 'entered OTP is invalid'),
    server_error: (prefix) => builder.prepare(500, prefix, 'server error'),
    server_maintenance: (prefix) => builder.prepare(500, prefix, 'maintenance mode is active'),
    inactive: (prefix) => builder.prepare(403, prefix, 'inactive'),
    not_found: (prefix) => builder.prepare(404, prefix, 'not found'),
    not_matched: (prefix) => builder.prepare(406, prefix, 'not matched'),
    not_verified: (prefix) => builder.prepare(406, prefix, 'not verified'),
    already_exists: (prefix) => builder.prepare(409, prefix, 'already exists'),
    already_updated: (prefix) => builder.prepare(200, prefix, 'already updated'),
    status_not_updated: (prefix) => builder.prepare(200, prefix, 'status not updated'),
    user_deleted: (prefix) => builder.prepare(406, prefix, 'deleted by admin'),
    user_blocked: (prefix) => builder.prepare(406, prefix, 'blocked by admin'),
    required_field: (prefix) => builder.prepare(419, prefix, 'field required'),
    too_many_request: (prefix) => builder.prepare(429, prefix, 'too many request'),
    expired: (prefix) => builder.prepare(417, prefix, 'expired'),
    canceled: (prefix) => builder.prepare(419, prefix, 'canceled'),
    created: (prefix) => builder.prepare(200, prefix, 'Created'),
    updated: (prefix) => builder.prepare(200, prefix, 'Updated'),
    deleted: (prefix) => builder.prepare(417, prefix, 'Deleted'),
    blocked: (prefix) => builder.prepare(401, prefix, 'Blocked'),
    success: (prefix) => builder.prepare(200, prefix, 'Success'),
    successfully: (prefix) => builder.prepare(200, prefix, 'Successfully'),
    error: (prefix) => builder.prepare(500, prefix, 'error'),
    no_prefix: (prefix) => builder.prepare(200, prefix, ''),
    bad_request: (prefix) => builder.prepare(400, prefix, ''),
    invalid: (prefix) => builder.prepare(406, prefix, 'invalid'),
    custom: { ...customMessages },
    notifications,
};

Object.defineProperty(builder, 'prepare', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: (code, prefix, message) => ({
        statusCode: code,
        code,
        message: `${prefix ? `${prefix} ${message}` : message}`,
    }),
});
module.exports = builder;