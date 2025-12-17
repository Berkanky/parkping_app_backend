function format_string(word) {
  if (!word) return null;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

module.exports = format_string;