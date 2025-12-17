function FormatNumber(num) {
    num = parseFloat(num).toFixed(2);
    var numStr = num.toString();
    var parts = numStr.split(".");
    var integerPart = parts[0];
    var fractionalPart = parts[1];
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return integerPart + "," + fractionalPart;
};

module.exports = FormatNumber;