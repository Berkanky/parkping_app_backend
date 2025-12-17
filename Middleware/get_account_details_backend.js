var user = require("../schemas/user_schema");
var AES256GCMDecrypt = require("../EncryptModules/AES256GCMDecrypt");

var FormatDateFunction = require("../functions/FormatDateFunction");

async function get_account_details_backend (req, res, next){

    var current_user = await user.findById(req.UserId).lean();
    if( !current_user ) return res.status(404).json({ message:' User not found, please log in or register again.'});

    req.UserId = (current_user._id).toString();

    current_user.updated_date = current_user.updated_date ? FormatDateFunction(current_user.updated_date) : null;
    current_user.created_date = FormatDateFunction(current_user.created_date);
    current_user.login_date = FormatDateFunction(current_user.login_date);
    current_user.last_login_date = FormatDateFunction(current_user.last_login_date);
    current_user.phone_number_encrypted = current_user.phone_number_encrypted ? AES256GCMDecrypt(current_user.phone_number_encrypted) : '-';

    if( current_user.backup_phone_numbers ){
        for(var i = 0; i < current_user.backup_phone_numbers.length; i++){
            var backup_phone_row = current_user.backup_phone_numbers[i];
            backup_phone_row.phone_number_encrypted =  AES256GCMDecrypt(backup_phone_row.phone_number_encrypted);
        };  
    }

    req.current_user = current_user;
    return next();
};

module.exports = get_account_details_backend;