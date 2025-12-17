function GenerateRandomHexCode() {
  var hexChars = '0123456789ABCDEF';
  var hexCode = '#';
  for (let i = 0; i < 6; i++) {
    hexCode += hexChars[Math.floor(Math.random() * 16)];
  }
  return hexCode;
};

module.exports = GenerateRandomHexCode;