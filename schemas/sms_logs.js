const mongoose = require('mongoose');

var sms_log_schema = new mongoose.Schema({
    user_id: {
        type: String
    },
    session_id: {
        type: String
    },
    phone_number: {
        type: String,
    },
    dial_code: {
        type: String
    },
    type: {
        type: String
    },
    status: {
        type: String
    },
    valid: {
        type: Boolean
    },
    error_code: {
        type: String
    },
    created_date: {
        type: Date
    },
    verified_date: {
        type: Date
    },
    attemp_count: {
        type: Number
    },
    channel: {
        type: String
    }
});

var smslog = mongoose.model('smslog', sms_log_schema);
module.exports = smslog;