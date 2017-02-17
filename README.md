# wxbarcode

  微信小程序生成条码和二维码模块。

  [![NPM Version][npm-image]][npm-url]
  [![NPM Downloads][downloads-image]][downloads-url]

[![NPM](https://nodei.co/npm/wxbarcode.png?compact=true)](https://nodei.co/npm/wxbarcode/)

## 效果

![截图](https://raw.githubusercontent.com/alsey/wxbarcode/master/capture.png)

## 安装

```bash
$ npm install wxbarcode
```

## 使用方法

```js
import wxbarcode from 'wxbarcode'

wxbarcode.barcode('barcode', '1234567890123456789', 680, 200);
wxbarcode.qrcode('qrcode', '1234567890123456789', 420, 420);
```

### 条形码

函数名：barcode

函数原型：barcode(id, code, width, height)

参数：

- id: wxml文件中的 Canvas ID
- code: 用于生成条形码的字符串
- width: 生成的条形码宽度，单位 rpx
- height: 生成的条形码高度，单位 rpx

### 二维码

函数名：qrcode

函数原型：qrcode(id, code, width, height)

参数：

- id: wxml文件中的 Canvas ID
- code: 用于生成二维码的字符串
- width: 生成的二维码宽度，单位 rpx
- height: 生成的二维码高度，单位 rpx

## 例子

请参考`demo`文件夹下代码。

## License

  [MIT](LICENSE)

[npm-image]: https://badge.fury.io/js/wxbarcode.svg
[npm-url]: https://npmjs.org/package/wxbarcode
[downloads-image]: https://img.shields.io/npm/dm/wxbarcode.svg
[downloads-url]: https://npmjs.org/package/wxbarcode
