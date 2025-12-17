const crypto = require('crypto');

function create_hash_sha256(val){
    return crypto.createHash("sha256").update(val).digest("hex")
};

module.exports = create_hash_sha256;