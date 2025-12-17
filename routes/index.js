const express = require("express");
const app = express.Router();
const crypto = require('crypto');

var SetResCookie = require("../Cookie_Operations/SetResCookie");
var ClearResCookie = require("../Cookie_Operations/ClearResCookie");

const { ObjectId } = require("mongodb");

const qrcode = require('qrcode');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

//GridFS Fotoğraf modülü.
var create_picture_grid_fs = require("../insert_operations/create_picture_grid_fs");
var read_picture_grid_fs = require("../insert_operations/read_picture_grid_fs");

//Middleware
var create_session_id = require("../Middleware/create_session_id");
var set_service_action_name = require("../Middleware/set_service_action_name");
var rate_limiter = require("../Middleware/rate_limiter");
var get_account_details_backend = require("../Middleware/get_account_details_backend");

//JWT modülleri.
var control_jwt_token = require("../jwt_modules/control_jwt_token");
var create_jwt_token = require("../jwt_modules/create_jwt_token");

//JOİ şemalar.
var google_login_service_schema = require("../joi_schemas/google_login_service_schema");
var update_profile_service_schema = require("../joi_schemas/update_profile_service_schema");
var add_vehicle_service_schema = require("../joi_schemas/add_vehicle_service_schema");
var picture_detail_service_schema = require("../joi_schemas/picture_detail_service_schema");
var vehicle_detail_service_schema = require("../joi_schemas/vehicle_detail_service_schema");
var delete_account_service_schema = require("../joi_schemas/delete_account_service_schema");
var send_message_service_schema = require("../joi_schemas/send_message_service_schema");
var delete_message_service_schema = require("../joi_schemas/delete_message_service_schema");
var delete_vehicle_service_schema = require("../joi_schemas/delete_vehicle_service_schema");
var qr_code_download_service_schema = require("../joi_schemas/qr_code_download_service_schema");

//MongoDB Şemaları.
var user = require("../schemas/user_schema");
var vehicle = require("../schemas/vehicle_schema");
var conversationmessage = require("../schemas/message_schema");
var vehicleaccesstoken = require("../schemas/vehicle_profile_access_token_schema");

//Fonksiyonlar
var verify_google_id_token = require("../auth/verify_google_id_token");
var FormatDateFunction = require("../functions/FormatDateFunction");
var capitalize = require("../functions/capitalize");
var plate_upper = require("../functions/plate_upper");

//Şifreleme modülleri.
var AES256GCMDecrypt = require("../EncryptModules/AES256GCMDecrypt");
var AES256GCMEncrypt = require("../EncryptModules/AES256GCMEncrypt");
var create_hash_sha256 = require("../EncryptModules/HASH_SHA256");

//app_config.js
var { LoadConfig } = require('../ConfigOperations/app_config');

var load_config = LoadConfig();
var jwt_authorized_paths = load_config?.app_jwt_authorized_paths?.paths;

var { NODE_ENV, JWT_AUDIENCE_PROD } = process.env;

if( !NODE_ENV ) throw "Missing required fields.";
if( !JWT_AUDIENCE_PROD ) throw "JWT_AUDIENCE_PROD required. ";
if( !jwt_authorized_paths.length ) throw "jwt_authorized_paths required.";

async function create_qr_code(url){
    var qr_code = await qrcode.toDataURL(url);
    return qr_code;
};

function create_token_function(){

    var token = crypto.randomBytes(24).toString("hex");
    var hashed_token = create_hash_sha256(token);

    return { token, hashed_token };
};

function create_public_code(opts = {}){ //{ length: 8, groupSize: 4 }
    var HUMAN_SAFE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    var length = Number.isInteger(opts.length) ? opts.length : 8;
    var group_size = Number.isInteger(opts.group_size) ? opts.group_size : 4;

    var alphabet = typeof opts.alphabet === 'string' && opts.alphabet.length >= 16
        ? opts.alphabet
        : HUMAN_SAFE_ALPHABET;

    if (length < 4 || length > 32) throw new Error('length must be between 4 and 32');
    if (group_size < 0 || group_size > 32) throw new Error('groupSize must be between 0 and 32');

    var raw = '';
    for (var i = 0; i < length; i++) {
        raw += alphabet[crypto.randomInt(0, alphabet.length)];
    };

    if (!group_size) return raw;

    var parts = [];
    for (var i = 0; i < raw.length; i += group_size) {
        parts.push(raw.slice(i, i + group_size));
    };

    var created_public_code = parts.join('-');

    var public_code_hash = create_hash_sha256(created_public_code);
    var public_code_enc = AES256GCMEncrypt(created_public_code);

    return { public_code_hash, public_code_enc };
};

//Google ile giriş yap.
app.post(
    "/auth/google",
    rate_limiter,
    create_session_id,
    set_service_action_name({action: "google login" }),
    async(req, res) => {
        
        var { id_token } = req.body;

        var { error } = google_login_service_schema.validate(req.body, { abortEarly: false });
        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        try{

            var {
                email_verified,
                google_id,
                email_address,
                name,
                surname,
                profile_picture,
                iat,
                exp
            } = await verify_google_id_token(id_token);
            if( !email_verified ) return res.status(401).json({ message: 'Email not verified.', success: false });

            var user_filter = { google_id: google_id };
            var current_user = await user.findOne(user_filter);

            var user_id;

            if( !current_user ) {
                var new_user_obj = {
                    google_id: google_id,
                    email_address: email_address || '-',
                    name: name || '-',
                    surname: surname || '-',
                    created_date: new Date(),
                    active: true,
                    login_date: new Date()
                };

                var new_user = new user(new_user_obj);
                await new_user.save();

                user_id = new_user._id.toString();
            } else if( current_user ) {

                user_id = current_user._id.toString();
                var update_user = {
                    $set:{
                        active: true,
                        login_date: new Date(),
                        is_deleted: false
                    },
                    $unset:{
                        delete_reason: ''
                    }
                };
                await user.findByIdAndUpdate(user_id, update_user);
            }

            var { Token } = await create_jwt_token(req, res, user_id, "15m", req.session_id);

            /* jwt_authorized_paths.forEach(function(row){
                SetResCookie(req, res, "Token", Token, 15 * 60 * 1000, row);
            }); */
            SetResCookie(req, res, "Token", Token, 15 * 60 * 1000, "/");

            res.set('Cache-Control','no-store');
            return res.status(200).json({ message:'Welcome to the ParkPing app.', success: true});

        }catch(err){
            console.error(err);
            return res.status(500).json({ message: 'Google login service error. ', success: false});
        }
    }
);

//Kullanıcı oturumunu doğrula.
app.get(
    '/auth/session',
    control_jwt_token,
    async(req, res) => {
        try{
            return res.status(200).json({ message:' The session has been successfully verified.', success: true });
        }catch(err){    
            console.error(err);
            return res.status(500).json({ message:' Auth-session control service error. ', success: false});
        }
    }
);

//Kullanıcı bilgilerini getir.
app.get(
    "/user-details",
    rate_limiter,
    control_jwt_token,
    get_account_details_backend,
    async(req, res) => {
        try{
            return res.status(200).json({ user: req.current_user });
        }catch(err){
            return res.status(500).json({ message:' User details service error. ', success: false});
        }
    }
);

//Hesap sil servisi.
app.delete(
    "/delete-account",
    rate_limiter,
    control_jwt_token,
    get_account_details_backend,
    set_service_action_name({action: "delete-account"}),
    async(req, res) => {

        var { delete_reason } = req.body;

        var { error } = delete_account_service_schema.validate(req.body, { abortEarly: false });
        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        try{
            var user_update = { 
                $set:{
                    updated_date: new Date(),
                    active: false,
                    last_login_date: new Date(),
                    delete_reason: delete_reason || ''
                } 
            };

            await user.findByIdAndUpdate(req.UserId, user_update);

            var conversation_message_filter = { sender_user_id: req.UserId };
            var conversation_messages = await conversationmessage.find(conversation_message_filter);
            for(var i = 0; i < conversation_messages.length; i++){
                var conversation_message_row = conversation_messages[i];

                var conversation_message_id = conversation_message_row._id.toString();
                await conversationmessage.findByIdAndDelete(conversation_message_id);
            };

            var vehicle_filter = { user_id: req.UserId };
            var vehicles = await vehicle.find(vehicle_filter);
            for(var i = 0; i < vehicles.length; i++){
                var vehicle_row = vehicles[i];

                var vehicle_id = vehicle_row._id.toString();
                await vehicle.findByIdAndDelete(vehicle_id);
            };

            return res.status(204).json({ message:' Your account has been successfully deleted.', success: true});
        }catch(err){
            console.error(err);
            return res.status(500).json({ message:' Delete account service error. ', success: false});
        }
    }
);

//Çıkış yap servisi.
app.post(
    "/logout",
    rate_limiter,
    control_jwt_token,
    get_account_details_backend,
    set_service_action_name({action:'logout'}),
    async(req, res) => {
        try{    
            var user_update = {
                $set:{
                    last_login_date: new Date(),
                    active: false
                }
            };

            await user.findByIdAndUpdate(req.UserId, user_update);

            /* jwt_authorized_paths.forEach(function(row){
                ClearResCookie(req, res, "Token", row);
            }); */

            ClearResCookie(req, res, "Token", '/');

            return res.status(200).json({ message:' The user session has been successfully terminated.', success: true});
        }catch(err){
            console.error(err);
            return res.status(500).json({ message:'Logout service error. ', success: false});
        }
    }
);

//Profil Güncelleme
app.post(
    "/update-profile",
    rate_limiter,
    control_jwt_token,  
    get_account_details_backend,
    set_service_action_name({action:'update-profile'}),
    async(req, res) => {

        var { 
            name,
            surname,
            dial_code,
            phone_number,
            backup_phones
        } = req.body;

        var { error } = update_profile_service_schema.validate(req.body, { abortEarly: false });
        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        try{

            var phone_number_hash, phone_number_encrypted;

            if( phone_number ) {

                phone_number_hash = create_hash_sha256(phone_number);
                phone_number_encrypted = AES256GCMEncrypt(phone_number); 
            }

            var user_backup_phone_numbers = req?.current_user?.backup_phone_numbers || [];

            if( backup_phones && backup_phones.length ){

                for(var i = 0; i < backup_phones.length; i++){

                    var backup_phone_row = backup_phones[i];
                    if( !backup_phone_row?.phone_number ) continue;

                    var hashed_phone_number = create_hash_sha256(backup_phone_row?.phone_number);

                    var is_phone_number_existing = user_backup_phone_numbers.some(function(item){ return item.phone_number_hash === hashed_phone_number });

                    backup_phone_row.phone_number_hash = hashed_phone_number;
                    backup_phone_row.phone_number_encrypted = AES256GCMEncrypt(backup_phone_row.phone_number); 
                    backup_phone_row.is_existing = is_phone_number_existing;
                };

                backup_phones = backup_phones.filter(function(item){ return item.is_existing === false });
            }

            var user_update = {
                $set:{
                    name: name || '',
                    surname: surname || '',
                    dial_code: dial_code || '',
                    phone_number_hash: phone_number_hash || '',
                    phone_number_encrypted: phone_number_encrypted || '',
                    updated_date: new Date(),
                },
                $push:{
                    backup_phone_numbers: {
                        $each: backup_phones ? backup_phones : []
                    }
                }
            };

            await user.findByIdAndUpdate(req.UserId, user_update);
            return res.status(200).json({ message:' Account information has been successfully updated.', success: true });
        
        }catch(err){
            console.error(err);
            return res.status(500).json({ message:'Update profile service error. ', success: false});
        }
    }
);

//Otomobil Ekle - var olan kaydı güncelle.
app.post(
    "/add-vehicle",
    rate_limiter,
    control_jwt_token,  
    get_account_details_backend,
    set_service_action_name({action:'add-vehicle'}),
    upload.array("vehicle_pictures", 3),
    async(req, res) => {
        var { 
            make, 
            model, 
            color, 
            vehicle_type,
            plate,
            qr_code_delete,
            qr_code_update,
        } = req.body;

        var files = req.files;

        if( files ) files.forEach(function(row){ return row.type = "vehicle_attachment" });

        var { error } = add_vehicle_service_schema.validate(req.body, { abortEarly: false });
        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        try{

            var vehicle_filter = { plate: plate, user_id: req.UserId };
            var existing_vehicle = await vehicle.findOne(vehicle_filter);

            var uploaded_pictures = [];
            var vehicle_id; 
            var request_date = new Date();

            if( existing_vehicle ) {

                vehicle_id = existing_vehicle._id.toString();

                if (files && files.length > 0) uploaded_pictures = await create_picture_grid_fs(req, vehicle_id, files);
                var picture_ids = uploaded_pictures.map((p) => { return { file_id: p.file_id, created_date: new Date() } });

                if( qr_code_update == 'true' || qr_code_delete == 'true' ) {

                    var existing_qr_code_token_filter = { vehicle_id: vehicle_id, revoked: false };
                    var existing_qr_code_token_update = {
                        $set: {
                            revoked: true,
                            revoked_date: new Date()
                        }
                    };

                    await vehicleaccesstoken.updateMany(existing_qr_code_token_filter, existing_qr_code_token_update);

                    if( qr_code_update == 'true' ) {

                        var { token, hashed_token } = create_token_function();
                        var { public_code_hash, public_code_enc } = create_public_code();

                        var vehicle_profile_url = JWT_AUDIENCE_PROD + "/vehicle-detail" + "?qr_code_token=" +  token;
                        var qr_data = await create_qr_code(vehicle_profile_url);

                        var new_qr_code_token_obj = {
                            user_id: req.UserId,
                            vehicle_id: vehicle_id,
                            token_hash: hashed_token,
                            public_code_hash: public_code_hash,
                            public_code_enc: public_code_enc,
                            qr_data: qr_data
                        };

                        var new_qr_code_token = new vehicleaccesstoken(new_qr_code_token_obj);
                        await new_qr_code_token.save();
                    }
                }

                var vehicle_update = {
                    $set: {
                        make: make || '-',
                        model: model || '-',
                        color: color || '-',
                        vehicle_type: vehicle_type || '-',
                        updated_date: request_date
                    },
                    $push:{
                        vehicle_pictures: { $each: picture_ids ? picture_ids : [] }
                    }
                };

                await vehicle.findByIdAndUpdate(vehicle_id, vehicle_update);

                return res.status(200).json({ message:' You already have a vehicle registered to this license plate, the vehicle associated with the relevant license plate has been successfully updated.'});
            }

            var new_vehicle_obj = {
                user_id: req.UserId,
                make: make || '-',
                model: model || '-',
                color: color || '-',
                vehicle_type: vehicle_type || '-',
                plate: plate,
                created_date: request_date
            };

            var new_vehicle = new vehicle(new_vehicle_obj);
            await new_vehicle.save();

            vehicle_id = new_vehicle._id.toString();

            if (files && files.length > 0) uploaded_pictures = await create_picture_grid_fs(req, vehicle_id, files);
            var picture_ids = uploaded_pictures.map((p) => { return { file_id: p.file_id, created_date: new Date() } });

            var { token, hashed_token } = create_token_function();
            var { public_code_hash, public_code_enc } = create_public_code();

            var vehicle_profile_url = JWT_AUDIENCE_PROD + "/vehicle-detail" + "?qr_code_token=" +  token;
            var qr_data = await create_qr_code(vehicle_profile_url);

            var new_qr_code_token_obj = {
                user_id: req.UserId,
                vehicle_id: vehicle_id,
                token_hash: hashed_token,
                public_code_hash: public_code_hash,
                public_code_enc: public_code_enc,
                qr_data: qr_data
            };

            var new_qr_code_token = new vehicleaccesstoken(new_qr_code_token_obj);

            var vehicle_update = {
                $push:{
                    vehicle_pictures: { $each: picture_ids ? picture_ids : [] }
                }
            };

            await new_qr_code_token.save();
            await vehicle.findByIdAndUpdate(vehicle_id, vehicle_update);

            return res.status(200).json({ message:' The vehicle has been successfully registered.', success: true});
        }catch(err){
            console.error(err);
            return res.status(500).json({ message:'Add-vehicle service error. ', success: false});
        }
    }
);

//Otomobil sil
app.delete(
    "/delete-vehicle",
    rate_limiter,
    control_jwt_token,
    get_account_details_backend,
    set_service_action_name({action: "delete-vehicle"}),
    async(req, res) => {

        var { vehicle_id } = req.body;
        
        var { error } = delete_vehicle_service_schema.validate(req.body, { abortEarly: false });
        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        try{

            var db = req.app.locals.db;

            var conversation_messages_filter = { vehicle_id: vehicle_id };
            var vehicle_filter = { user_id: req.UserId, _id: vehicle_id };

            var existing_vehicle = await vehicle.findOne(vehicle_filter);
            if( !existing_vehicle ) return res.status(404).json({ message:' Vehicle information could not be found. Please try again later.', success: false});

            var vehicle_pictures = [];
            var vehicle_pictures_ids = [];

            vehicle_pictures =  existing_vehicle?.vehicle_pictures ? existing_vehicle.vehicle_pictures : [];
            if( vehicle_pictures ) vehicle_pictures_ids = vehicle_pictures.map(function(item){ return item.file_id = new ObjectId(item.file_id); });

            for( var i = 0; i < vehicle_pictures_ids.length; i++ ) {
                var vehicle_picture_row = vehicle_pictures[i];
                var vehicle_picture_id = vehicle_picture_row.file_id;

                await db.collection("pictures.files").deleteOne({ _id: vehicle_picture_id });
                await db.collection("pictures.chunks").deleteMany({ files_id: vehicle_picture_id });
            };  

            await vehicle.findByIdAndDelete(existing_vehicle._id.toString());
            await conversationmessage.deleteMany(conversation_messages_filter);

            return res.status(204).end();
        }catch(err){
            
            console.error("delete-vehicle error:", err);
            return res.status(400).json({ message: "Delete vehicle profile service error. ", success: false});

        }
    }
);

//Otomobillerimi getir.
app.get(
    "/my-vehicles",
    rate_limiter,
    control_jwt_token,
    get_account_details_backend,
    async(req, res) => {
        try{
            var vehicles_filter = { user_id: req.UserId };

            var vehicles = await vehicle.find(vehicles_filter).select("make model color plate created_date").lean();
            if( !vehicles.length ) return res.status(404).json({ message:' The car list could not be retrieved. Please add a new car and try again.', success: true });

            for(var i = 0; i < vehicles.length; i++){
                var vehicle_row = vehicles[i];

                vehicle_row.created_date = FormatDateFunction(String(vehicle_row.created_date));
                vehicle_row.make = capitalize(vehicle_row.make);
                vehicle_row.model = capitalize(vehicle_row.model);
                vehicle_row.color = capitalize(vehicle_row.color);
                vehicle_row.plate = plate_upper(vehicle_row.plate);
            };

            return res.status(200).json({ message: 'The list of registered vehicles has been successfully completed. ', vehicles: vehicles});
        }catch(err){
            console.error("My vehicles service error. ", err);
            return res.status(400).json({ message: "My vehicles service error. ", success: false});  
        }
    }
);

//Otomobil detaylarını getirir.
app.post(
    "/vehicle-detail",
    rate_limiter,
    control_jwt_token,
    get_account_details_backend,
    async(req, res) => {
        var { public_code, qr_code_token, vehicle_id } = req.body;

        var { error } = vehicle_detail_service_schema.validate(req.body, { abortEarly: false });
        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        try{

            if( vehicle_id ) {
                var is_requester_owner_vehicle = await vehicle.findOne({ _id: vehicle_id, user_id: req.UserId }).lean();
                if( !is_requester_owner_vehicle ) return res.status(400).json({ message:' Vehicle profile not found. Please ensure you are entering the correct information.', success: false });
            }

            var hashed_qr_code_token, hashed_public_code;

            if( qr_code_token ) hashed_qr_code_token = create_hash_sha256(qr_code_token);
            if( public_code ) hashed_public_code = create_hash_sha256(public_code);

            var existing_qr_code_token_filter = {};

            if( hashed_qr_code_token ) Object.assign(existing_qr_code_token_filter, { token_hash: hashed_qr_code_token, revoked: false } );
            else if( hashed_public_code ) Object.assign(existing_qr_code_token_filter, { public_code_hash: hashed_public_code, revoked: false } );

            var existing_qr_code_token = await vehicleaccesstoken.findOne(existing_qr_code_token_filter);
            if( !existing_qr_code_token ) return res.status(410).json({ message:' This QR code is no longer valid.'});

            var existing_vehicle_id = existing_qr_code_token.vehicle_id.toString();

            var vehicle_detail_filter = { _id: existing_vehicle_id };
            var vehicle_detail = await vehicle.findOne(vehicle_detail_filter)
                .select("-vehicle_pictures")
                .populate({
                    path: "user_id",
                    select: "name surname dial_code phone_number_encrypted email_address"
                })
                .lean();
            if( !vehicle_detail ) return res.status(404).json({ message:' Vehicle information could not be found. Please try again later.'});
            
            var {  _id, email_address, name, surname, dial_code, phone_number_encrypted } = vehicle_detail.user_id;
            
            var owner_details = {
                _id: _id.toString(),
                email_address: email_address || '-',
                name: name || '-',
                surname: surname || '-',
                dial_code: dial_code || '-'
            };

            var is_requester_owner = req.UserId == owner_details._id ? true : false;

            if( vehicle_detail?.user_id?.phone_number_encrypted ) {
                var phone_number = vehicle_detail?.user_id?.phone_number_encrypted ? AES256GCMDecrypt(vehicle_detail.user_id.phone_number_encrypted) : null;
                var formatted_phone_number = vehicle_detail.user_id.dial_code + phone_number;

                owner_details.formatted_phone_number = formatted_phone_number;
                owner_details.phone_number = phone_number;
            }

            vehicle_detail.owner_details = owner_details;
            delete vehicle_detail.user_id;

            vehicle_detail.created_date = FormatDateFunction(vehicle_detail.created_date);

            var pictures = await read_picture_grid_fs(req, existing_vehicle_id, "vehicle_attachment");
            if( pictures && pictures.length > 0 ) vehicle_detail.vehicle_pictures = pictures;

            var conversation_message_filter = { 
                vehicle_id: vehicle_detail._id.toString(), 
                message_type: 'text'
            };

            if( !is_requester_owner ) Object.assign(conversation_message_filter, { is_public: true });

            var conversation_messages = await conversationmessage
                .find(conversation_message_filter)
                .sort({ created_date: 1 })
                .lean();

            conversation_messages = conversation_messages.map(function(item){ return { ...item, message: AES256GCMDecrypt(item.message), created_date: FormatDateFunction(String(item.created_date)) } });

            vehicle_detail.conversation_messages_length = conversation_messages.length;
            vehicle_detail.conversation_messages = conversation_messages;

            if( (existing_qr_code_token.user_id).toString() === req.UserId ) {

                vehicle_detail.access_token_details = {
                    qr_data: existing_qr_code_token?.qr_data || '-',
                    public_code: existing_qr_code_token?.public_code_enc ? AES256GCMDecrypt(existing_qr_code_token.public_code_enc) : '-'
                };
            }

            var existing_qr_code_token_update = {
                $set: {
                    last_used_date: new Date(),
                    use_count: existing_qr_code_token.use_count + 1
                }
            };
            await vehicleaccesstoken.findOneAndUpdate(existing_qr_code_token_filter, existing_qr_code_token_update);

            return res.status(200).json({ message:' Vehicle information found successfully.', vehicle_detail });
        }catch(err){
            console.error(err);
            return res.status(500).json({ message:'Vehicle-detail service error. ', success: false});
        }
    }
);

//Fotoğraf getir.
app.get(
    "/vehicle-picture/:file_id", 
    async (req, res) => {

    var { file_id } = req.params;

    var { error } = picture_detail_service_schema.validate(req.params, { abortEarly: false });
    if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

    try {

        var bucket = req.app.locals.pictures_bucket;
        if (!bucket) return res.status(500).json({ message: "File storage is not available." });

        var object_file_id = new ObjectId(file_id);

        var download_stream = bucket.openDownloadStream(object_file_id);

        download_stream.on("file", (file) => {
            res.setHeader(
                "Content-Type",
                file.contentType || "application/octet-stream"
            );
        });

        download_stream.on("error", (err) => {
            if (!res.headersSent) return res.status(404).json({ message: "File not found." });
        });

        download_stream.pipe(res);
    } catch (err) {
        console.error("vehicle-picture error:", err);
        return res.status(400).json({ message: "Invalid file id." });
    }
});

//mesaj bırak.
app.post(
    "/send-message",
    rate_limiter,
    control_jwt_token,
    get_account_details_backend,
    set_service_action_name({action:'send-message'}),
    async(req, res) => {

        var { message, message_type, vehicle_id } = req.body;

        var { error } = send_message_service_schema.validate(req.body, { abortEarly: false });
        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        try{
            var vehicle_detail = await vehicle.findById(vehicle_id);
            if( !vehicle_detail ) return res.status(404).json({ message:' Vehicle information could not be found. Please try again later.'});

            var conversation_messages_filter = { vehicle_id: vehicle_id, sender_user_id: req.UserId };
            var conversation_messages = await conversationmessage.find(conversation_messages_filter).lean();
            if( conversation_messages.length == 2 || conversation_messages.length > 2 ) return res.status(429).json({ message:' You have reached the maximum number of messages for this vehicle.'});

            var conversation_id = crypto.randomUUID();
            var sender_user_id = req.UserId;
            var owner_user_id = (vehicle_detail.user_id._id).toString();
            var encrypted_message = AES256GCMEncrypt(message);
            var is_public = message_type == "warning" ? true : false;

            var new_message_obj = {
                conversation_id: conversation_id,
                vehicle_id: vehicle_id,
                message: encrypted_message,
                owner_user_id: owner_user_id,
                sender_user_id: sender_user_id,
                is_public: is_public,
                message_type: message_type,
                session_id: create_hash_sha256(req.session_id)
            };

            var new_message = new conversationmessage(new_message_obj);
            await new_message.save();

            return res.status(200).json({ message:' The message was sent successfully.', success: true});
        }catch(err){

            console.error("vehicle-picture error:", err);
            return res.status(400).json({ message: "Message service error. ", success: false});
        }
    }
);

//mesaj sil.
app.delete(
    "/delete-message",
    control_jwt_token,
    get_account_details_backend,
    set_service_action_name({action:"delete-message"}),
    async(req, res) => {

        var { message_id } = req.body; 
        
        var { error } = delete_message_service_schema.validate(req.body, { abortEarly: false });
        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        try{
            
            var current_user_id = req.UserId;
            
            var conversation_message_filter = { _id: message_id };
            var conversation_message = await conversationmessage.findOne(conversation_message_filter).lean();
            if( !conversation_message ) return res.status(404).json({ message:' The message information to be deleted could not be found. Please try again later.'});

            if( (conversation_message.owner_user_id).toString() === current_user_id || (conversation_message.sender_user_id).toString() === current_user_id ) await conversationmessage.findByIdAndDelete(message_id);
            else return res.status(403).json({ message:' You are not allowed to delete this message.'});

            return res.status(204).end();
        }catch(err){

            console.error("Delete message service error:", err);
            return res.status(400).json({ message: "Delete message service error. ", success: false});  
        }
    }
);

//QR indir.
app.get(
    "/vehicle-profile-qr-download/:vehicle_id",
    rate_limiter,
    control_jwt_token,
    get_account_details_backend,
    set_service_action_name({action: "vehicle-profile-qr-download"}),
    async(req, res) => {

        var { vehicle_id } = req.params;

        var { error } = qr_code_download_service_schema.validate(req.params, { abortEarly: false });
        if( error) return res.status(400).json({errors: error.details.map(detail => detail.message)});

        try{
            
            var existing_vehicle_access_token_filter = { vehicle_id: vehicle_id, user_id: req.UserId, revoked: false };
            var existing_vehicle_access_token = await vehicleaccesstoken.findOne(existing_vehicle_access_token_filter).lean();
            
            if( !existing_vehicle_access_token ) return res.status(404).json({ message:' Vehicle information could not be found. Please try again later.', success: false });

            var is_qr_data_existing = existing_vehicle_access_token?.qr_data ? true : false;
            if( !is_qr_data_existing ) return res.status(404).json({ message:' No QR code information was found for this vehicle.', success: false });

            var existing_vehicle_id = existing_vehicle_access_token.vehicle_id.toString();
            var qr_data = existing_vehicle_access_token.qr_data;
            var base_64_data = qr_data.replace(/^data:image\/png;base64,/, '');
            var buffer = Buffer.from(base_64_data, 'base64');

            var qr_data_file_name = 'parkping-qr-' + existing_vehicle_id + '-' + new Date().getTime() + '.png';

            res.setHeader('Content-Type', 'image/png');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename=${qr_data_file_name}`
            );

            return res.send(buffer);
        }catch(err){
            console.error("Vehicle QR code download service error. ", err);
            return res.status(400).json({ message: "Vehicle QR code download service error. ", success: false});  
        }
    }
);

module.exports = app;