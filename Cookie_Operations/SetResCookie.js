var IS_PROD = process.env.NODE_ENV === 'production';
var sameSite = IS_PROD ? "None" : 'lax';
var domain = IS_PROD ? process.env.APP_DOMAIN : null;

function SetResCookie(req, res, key, value, duration, path){

    var cookie_options =  {
        httpOnly: true,
        secure: IS_PROD,       
        sameSite,      
        maxAge: duration,
        path,
        domain,
        priority: 'High'
    };

    if( !IS_PROD ) delete cookie_options["domain"];

    res.cookie(key, value, cookie_options);
};

module.exports = SetResCookie;