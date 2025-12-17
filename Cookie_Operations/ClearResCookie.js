var IS_PROD = process.env.NODE_ENV === 'production';
var sameSite = IS_PROD ? "None" : 'lax';
var domain = IS_PROD ? process.env.APP_DOMAIN : null;

function ClearResCookie(req, res, key, path){

    var cookie_options = {
        httpOnly: true,
        secure: IS_PROD,
        sameSite,
        path,
        domain
    };

    if( !IS_PROD ) delete cookie_options["domain"];

    res.clearCookie(key, cookie_options);
};

module.exports = ClearResCookie;