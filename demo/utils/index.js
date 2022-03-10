const barcode = require('./barcode');
const qrcode = require('./qrcode');

function convert_length(length) {
	return Math.round(wx.getSystemInfoSync().windowWidth * length / 750);
}

function barc(id, code, width, height, that) {
	const query = that ? wx.createSelectorQuery().in(that) : wx.createSelectorQuery()
	query.select(id)
		.fields({ node: true, size: true })
		.exec((res) => {
			const canvas = res[0].node
			const ctx = canvas.getContext('2d')
			canvas.width = convert_length(width)
			canvas.height = convert_length(height)
			barcode.code128(ctx, code, convert_length(width), convert_length(height))
		})
}

function qrc(id, code, width, height, that) {
	const query = that ? wx.createSelectorQuery().in(that) : wx.createSelectorQuery()
	query.select(id)
		.fields({ node: true, size: true })
		.exec((res) => {
			const canvas = res[0].node
			const ctx = canvas.getContext('2d')
			canvas.width = convert_length(width)
			canvas.height = convert_length(height)
			qrcode.api.draw(code, {
				ctx: ctx,
				width: convert_length(width),
				height: convert_length(height)
			})
		})
}

module.exports = {
	barcode: barc,
	qrcode: qrc
}