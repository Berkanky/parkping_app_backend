const crypto = require('crypto');

function generateSecretKey(bytes = 32) {

    var created_secret_key = crypto.randomBytes(bytes).toString('hex');
    return created_secret_key;
};

module.exports = generateSecretKey;