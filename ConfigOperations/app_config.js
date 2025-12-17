const fs = require('fs');
const path = require('path');

var CONFIG_PATH = path.join(__dirname, '../app_config.json');

function LoadConfig() {

    var config_cache, file_last_modified = null;

    var stats = fs.statSync(CONFIG_PATH);
    var mtime = stats.mtime.getTime();

    if (file_last_modified && file_last_modified === mtime) return config_cache;

    var rawData = fs.readFileSync(CONFIG_PATH, 'utf8');
    config_cache = JSON.parse(rawData);

    file_last_modified = mtime;
    return config_cache;
}

module.exports = { LoadConfig };