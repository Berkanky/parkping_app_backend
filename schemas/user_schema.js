const mongoose = require('mongoose');

var backup_phone_schema = new mongoose.Schema({
    dial_code:{
        type: String
    },
    phone_number_hash:{
        type: String
    },
    phone_number_encrypted:{
        type: String
    },
    name:{
        type: String
    },
    surname:{
        type: String
    },
    proximity:{
        type: String
    }
});

var user_schema = new mongoose.Schema({
    google_id:{
        type: String
    },
    email_address:{
        type: String,
        required: true,
        unique: true
    },
    profile_picture:{
        type: String
    },
    name:{
        type: String
    },
    surname:{
        type: String
    },
    dial_code:{
        type: String
    },
    phone_number_hash:{
        type: String
    },
    phone_number_encrypted:{
        type: String
    },
    created_date:{
        type: Date
    },
    updated_date:{
        type: Date
    },
    last_login_date:{
        type: Date
    },
    login_date:{
        type: Date
    },
    active:{
        type: Boolean
    },
    is_deleted:{
        type: Boolean
    },
    delete_reason:{
        type: String
    },
    backup_phone_numbers:[backup_phone_schema]
});

var user = mongoose.model('user', user_schema);
module.exports = user;