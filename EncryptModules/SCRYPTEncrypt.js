const crypto = require('crypto');
const util = require('util');

const scrypt = util.promisify(crypto.scrypt);

var SALT_LENGTH = 16;
var KEY_LENGTH = 64;

var SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
};

var HASH_DELIMITER = '$';

async function SCRYPTEncrypt(plainPassword) {
  try {

    var salt = crypto.randomBytes(SALT_LENGTH);
    var hash = await scrypt(Buffer.from(plainPassword, 'utf8'), salt, KEY_LENGTH, SCRYPT_PARAMS);
    var saltBase64 = salt.toString('base64');
    var hashBase64 = hash.toString('base64');
    var paramsString = `N=${SCRYPT_PARAMS.N},r=${SCRYPT_PARAMS.r},p=${SCRYPT_PARAMS.p}`;
    return `scrypt${HASH_DELIMITER}${paramsString}${HASH_DELIMITER}${saltBase64}${HASH_DELIMITER}${hashBase64}`;
  } catch (error) {
    
    console.error("Scrypt hashleme hatası:", error);
    throw new Error("Şifre güvenli bir şekilde saklanamadı.");
  }
}

module.exports = SCRYPTEncrypt;