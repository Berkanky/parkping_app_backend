const jwt = require("jsonwebtoken");

const extract_service_token = require("../functions/extract_service_token");
const FormatDateFunction = require("../functions/FormatDateFunction");

var is_prod = process.env.NODE_ENV === "production" ? true : false;

var { SECRET_KEY, JWT_ISSUER_PROD, JWT_AUDIENCE_PROD, JWT_ISSUER_DEV, JWT_AUDIENCE_DEV, JWT_TOKEN_ALGORITHM } = process.env;
if (!SECRET_KEY || SECRET_KEY.length < 32) throw new Error('SECRET_KEY zayıf veya tanımsız');

var issuer = is_prod ? JWT_ISSUER_PROD : JWT_ISSUER_DEV;
var audience = is_prod ? JWT_AUDIENCE_PROD : JWT_AUDIENCE_DEV;

if (!issuer)   throw new Error("JWT_ISSUER tanımsız");
if (!audience) throw new Error("JWT_AUDIENCE tanımsız");
if (!JWT_TOKEN_ALGORITHM) throw new Error("JWT_TOKEN_ALGORITHM tanımsız");

var options = {
  algorithms: [JWT_TOKEN_ALGORITHM],
  issuer,
  audience,          
  clockTolerance: 5
};

var control_jwt_token = async (req, res, next) => {

  var Token = extract_service_token(req);
  if( !Token) return res.status(401).json({ message:' Session token required.'});

  try{
    var decoded = jwt.verify(Token, SECRET_KEY, options);

    req.UserId = decoded.UserId;
    req.session_id = decoded.session_id;
    req.jti = decoded.jti;
    req.Token = Token;
    
    req.session_end_date = FormatDateFunction(String(new Date(decoded.exp * 1000)));
    req.session_start_date = FormatDateFunction(String(new Date(decoded.iat * 1000)));

    return next();

  }catch (err) {
    return res.status(401).json({ message: "Your session token is invalid or has expired. Please log in again." });
  }
};

module.exports = control_jwt_token;