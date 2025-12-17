const mongoose = require('mongoose');

var vehicle_picture_schema = new mongoose.Schema({
    file_id:{
        type: mongoose.Schema.Types.ObjectId
    },
    created_date:{
        type: Date
    }
});

var vehicle_schema = new mongoose.Schema({
    user_id:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'user'
    },
    make:{
        type: String
    },
    model:{
        type: String
    },
    color:{
        type: String
    },
    vehicle_type:{
        type: String
    },
    plate:{
        type: String
    },
    created_date:{
        type: Date
    },
    updated_date:{
        type: Date
    },
    qr_data:{
        type: String
    },
    vehicle_pictures:[vehicle_picture_schema]
});

var vehicle = mongoose.model('vehicle', vehicle_schema);
module.exports = vehicle;