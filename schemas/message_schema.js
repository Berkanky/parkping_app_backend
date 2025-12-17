const mongoose = require('mongoose');

var message_schema = new mongoose.Schema({
    conversation_id:{
        type: String,
        required: true
    },
    vehicle_id:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'vehicle'
    },
    session_id:{
        type: String
    },
    owner_user_id:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'user'
    },
    sender_user_id:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'user'
    },
    message:{ //aes 256 gcm
        type: String,
        required: true
    },
    created_date:{
        type: Date,
        required: true,
        default: new Date()
    },
    is_public:{
        type: Boolean,
        required: true
    },
    message_type:{
        type: String,
        enum: ['warning', 'info', 'feedback'],
        required: true
    }
});

var conversationmessage = mongoose.model('conversationmessage', message_schema);
module.exports = conversationmessage;