const crypto = require('crypto');
const util = require('util');

const scrypt = util.promisify(crypto.scrypt);
var HASH_DELIMITER = '$';

async function SCRYPTCheck(plainPasswordAttempt, storedHashString) {
  if (!plainPasswordAttempt || !storedHashString) {
    return false;
  }
  try {
    var parts = storedHashString.split(HASH_DELIMITER);
    if (parts.length !== 4 || parts[0] !== 'scrypt') {
      console.error("Geçersiz hash formatı.");
      return false;
    }

    var params = {};
    parts[1].split(',').forEach(part => {
      const [key, value] = part.split('=');
      if (key && value && ['N', 'r', 'p'].includes(key)) {
        params[key] = parseInt(value, 10);
      }
    });
    if (params.N === undefined || params.r === undefined || params.p === undefined) {
        console.error("Hash formatından parametreler okunamadı.");
        return false;
    }

    var salt = Buffer.from(parts[2], 'base64');
    var storedHash = Buffer.from(parts[3], 'base64');
    var derivedKey = await scrypt(Buffer.from(plainPasswordAttempt, 'utf8'), salt, storedHash.length, params);

    if (storedHash.length !== derivedKey.length) {
        return false;
    }
    return crypto.timingSafeEqual(storedHash, derivedKey);

  } catch (error) {
    console.error("Scrypt karşılaştırma hatası:", error);
    return false;
  }
}

module.exports = SCRYPTCheck;