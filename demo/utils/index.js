var barcode = require('./barcode');
var qrcode = require('./qrcode');

function convert_length(length) {
    return Math.round(wx.getSystemInfoSync().windowWidth * length / 750);
}

function barc(id, code, width, height) {
    barcode.code128(wx.createCanvasContext(id), code, convert_length(width), convert_length(height))
}

function qrc(id, code, width, height, icoPath, icoSize) {
    qrcode.api.draw(code, {
        ctx: wx.createCanvasContext(id),
        width: convert_length(width),
        height: convert_length(height),
    },
        null, null,
        icoPath, convert_length(icoSize))
}

module.exports = {
    barcode: barc,
    qrcode: qrc
}