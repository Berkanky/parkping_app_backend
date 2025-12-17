function extract_location_details(components) {
  var get = (type) => {
    var comp = components.find(c => c.types.includes(type));
    return comp ? comp.long_name || comp.longText : null;
  };

  var locality =
    get("locality") ||
    get("sublocality") ||
    get("sublocality_level_1");

  var state = get("administrative_area_level_1");
  var country = get("country");

  return { locality, state, country };
};

module.exports = extract_location_details;