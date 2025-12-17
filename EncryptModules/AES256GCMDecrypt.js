const crypto = require('crypto');

var ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '', 'base64');
if (ENCRYPTION_KEY.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes (base64).');

var ALGO = 'aes-256-gcm';
var AUTH_TAG_LEN = 16;          // 128-bit tag
var IV_LEN = 12;                // 96-bit nonce
var VER = 1;                    // payload version

function AES256GCMDecrypt(payloadB64, { aad = null } = {}) {
  var buf = Buffer.from(payloadB64, 'base64');

  if (buf.length < 30) throw new Error('Malformed payload');

  var ver = buf.readUInt8(0);
  if (ver !== VER) throw new Error(`Unsupported version: ${ver}`);

  var kid = buf.subarray(1, 2).toString('utf8'); // şimdilik kullanılmıyor; rotate için tut
  var iv = buf.subarray(2, 2 + IV_LEN);
  var tag = buf.subarray(2 + IV_LEN, 2 + IV_LEN + AUTH_TAG_LEN);
  var enc = buf.subarray(2 + IV_LEN + AUTH_TAG_LEN);

  var decipher = crypto.createDecipheriv(ALGO, ENCRYPTION_KEY, iv, { authTagLength: AUTH_TAG_LEN });
  if (aad) decipher.setAAD(Buffer.isBuffer(aad) ? aad : Buffer.from(String(aad)));
  decipher.setAuthTag(tag);

  try {
    var dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return dec.toString('utf8');
    
  } catch (e) {

    throw new Error('AUTHENTICATION_FAILED');
  }
}

module.exports = AES256GCMDecrypt;