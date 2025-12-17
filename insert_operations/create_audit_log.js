const auditlog = require("../schemas/audit_logs");

const { ObjectId } = require('mongodb');
const onFinished = require('on-finished');

//Şifreleme.
var create_hash_sha256 = require("../EncryptModules/HASH_SHA256");

//Fonksiyonlar.
var GetGeoCountry = require("../functions/GetGeoCountry");

//app.config
var { LoadConfig } = require('../ConfigOperations/app_config');

var { ISSUER } = process.env;
if( !ISSUER ) throw "ISSUER required. ";

var load_config = LoadConfig();

var app_hashed_keys = load_config?.app_hashed_keys?.keys;
var app_encrypted_keys = load_config?.app_encrypted_keys?.keys;
var app_audit_log_paths = load_config?.app_audit_log_paths?.paths;

var sensitive_keys = [...app_hashed_keys, ...app_encrypted_keys];

function hide_sensitive_key(obj){
  if( !Object.keys(obj).length ) return {};

  for(var key in obj){
    var is_key_sensitive = sensitive_keys.some(function(item){ return item === key });
    if( is_key_sensitive ) delete obj[key];
  };

  return obj;
};

async function create_audit_log(req, res, next) {

  try { 

    onFinished(res, async(err, res) => {
      var is_app_existing_in_audit_log_paths = false;

      if( req.path ) is_app_existing_in_audit_log_paths = app_audit_log_paths.some(function(item){ return item == req.path});
      if( is_app_existing_in_audit_log_paths === false ) return;

      var req_body = {};
      var req_params = {};

      if( req?.body ) Object.assign(req_body, req.body);
      if( req?.params ) Object.assign(req_params, req.params);

      var new_audit_log_obj = {   
        user_id: req?.UserId ? new ObjectId(req.UserId) : null,
        request_id: req?.id || null,
        session_id: req?.session_id ? create_hash_sha256(req.session_id) : null,
        action: req?.action_name || null,
        success: res?.statusCode > 199 && res.statusCode < 400 ? true : false,
        http_status: res?.statusCode || null,
        ip_address: req?.source_ip || null,
        user_agent: req.headers["user-agent"],
        geo_country: GetGeoCountry(req),
        method: req?.method || null,
        path: req?.path || null,
        request_params: Object.keys(req_params).length > 0 ? JSON.stringify(hide_sensitive_key(req_params)) : null,
        request_body: Object.keys(req_body).length > 0 ? JSON.stringify(hide_sensitive_key(req_body)) : null,
        provider: ISSUER,
      };

      var new_audit_log = new auditlog(new_audit_log_obj);
      await new_audit_log.save(); 
    });
  } catch (err) { 
    console.error(err);
  } finally{
    return next();
  }
};

module.exports = create_audit_log;