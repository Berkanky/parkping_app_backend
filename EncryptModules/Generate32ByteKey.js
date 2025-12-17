const crypto = require('crypto');

function create_jwt_secret_key(){
    var secret_key = crypto.randomBytes(32).toString('hex');
    console.log("secret_key : " + secret_key);
    return secret_key;
};

module.exports = create_jwt_secret_key;