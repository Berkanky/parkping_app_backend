function read_file_size(bytes) {
  var units = ['B', 'KB', 'MB', 'GB', 'TB'];
  var i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
};

module.exports = read_file_size;