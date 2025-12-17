function GetGeoCountry(req) {

  var c = req.headers["cf-ipcountry"];
  if (c && /^[A-Z]{2}$/.test(c)) return c;
  return null;
};

module.exports = GetGeoCountry;