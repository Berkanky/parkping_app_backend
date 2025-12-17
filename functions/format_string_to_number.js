function format_string_to_number(value) {
  if (value == null) return null;

  var s = String(value).trim();

  if (!s) return null;

  s = s.replace(/\s+/g, "");
  if (s.match(/^\d{1,3}(,\d{3})+\.\d+$/)) {
    s = s.replace(/,/g, "");
    return parseFloat(s);
  }

  if (s.match(/^\d{1,3}(\.\d{3})+,\d+$/)) {
    s = s.replace(/\./g, ""); // binlik
    s = s.replace(",", ".");  // ondalık
    return parseFloat(s);
  }

  if (s.includes(",") && !s.includes(".")) {
    s = s.replace(",", ".");
    return parseFloat(s);
  }

  var num = parseFloat(s);
  return isNaN(num) ? null : num;
};

module.exports = format_string_to_number;