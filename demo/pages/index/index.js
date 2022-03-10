import wxbarcode from '../../utils/index';

Page({

  data: {
    code: '1234567890123456789'
  },

  onReady() {
    wxbarcode.barcode('#barcode', '1234567890123456789', 680, 200);
    wxbarcode.qrcode('#qrcode', '1234567890123456789', 420, 420);
  }
})
