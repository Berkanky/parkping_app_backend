const mongoose = require('mongoose');

var vehicle_profile_access_token_schema = new mongoose.Schema({
    user_id:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'user'
    },
    vehicle_id:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'vehicle'
    },
    token_hash:{
        type: String,
        required: true,
        unique: true,
        index: true
    },
    created_date: {
        type: Date,
        required: true,
        default: new Date()
    },
    revoked: {
        type: Boolean,
        required: true,
        default: false
    },
    revoked_date:{
        type: Date,
        required: false,
        default: null
    },
    last_used_date:{
        type: Date,
        required: false,
        default: null
    },
    use_count:{
        type: Number,
        required: false,
        default: 0
    },
    public_code_hash:{
        type: String
    },
    public_code_enc:{
        type: String
    },
    qr_data:{
        type: String
    }
});

var vehicleaccesstoken = mongoose.model('vehicleaccesstoken', vehicle_profile_access_token_schema );
module.exports = vehicleaccesstoken;