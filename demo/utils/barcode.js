var CHAR_TILDE = 126;
var CODE_FNC1 = 102;

var SET_STARTA = 103;
var SET_STARTB = 104;
var SET_STARTC = 105;
var SET_SHIFT = 98;
var SET_CODEA = 101;
var SET_CODEB = 100;
var SET_STOP = 106;


var REPLACE_CODES = {
    CHAR_TILDE: CODE_FNC1 //~ corresponds to FNC1 in GS1-128 standard
}

var CODESET = {
    ANY: 1,
    AB: 2,
    A: 3,
    B: 4,
    C: 5
};

function getBytes(str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i));
    }
    return bytes;
}

exports.code128 = function (ctx, text, width, height) {

    width = parseInt(width);

    height = parseInt(height);

    var codes = stringToCode128(text);

    var g = new Graphics(ctx, width, height);

    var barWeight = g.area.width / ((codes.length - 3) * 11 + 35);

    var x = g.area.left;
    var y = g.area.top;
    for (var i = 0; i < codes.length; i++) {
        var c = codes[i];
        //two bars at a time: 1 black and 1 white
        for (var bar = 0; bar < 8; bar += 2) {
            var barW = PATTERNS[c][bar] * barWeight;
            // var barH = height - y - this.border;
            var barH = height - y;
            var spcW = PATTERNS[c][bar + 1] * barWeight;

            //no need to draw if 0 width
            if (barW > 0) {
                g.fillFgRect(x, y, barW, barH);
            }

            x += barW + spcW;
        }
    }

    ctx.draw();
}


function stringToCode128(text) {

    var barc = {
        currcs: CODESET.C
    };

    var bytes = getBytes(text);
    //decide starting codeset
    var index = bytes[0] == CHAR_TILDE ? 1 : 0;

    var csa1 = bytes.length > 0 ? codeSetAllowedFor(bytes[index++]) : CODESET.AB;
    var csa2 = bytes.length > 0 ? codeSetAllowedFor(bytes[index++]) : CODESET.AB;
    barc.currcs = getBestStartSet(csa1, csa2);
    barc.currcs = perhapsCodeC(bytes, barc.currcs);

    //if no codeset changes this will end up with bytes.length+3
    //start, checksum and stop
    var codes = new Array();

    switch (barc.currcs) {
        case CODESET.A:
            codes.push(SET_STARTA);
            break;
        case CODESET.B:
            codes.push(SET_STARTB);
            break;
        default:
            codes.push(SET_STARTC);
            break;
    }


    for (var i = 0; i < bytes.length; i++) {
        var b1 = bytes[i]; //get the first of a pair
        //should we translate/replace
        if (b1 in REPLACE_CODES) {
            codes.push(REPLACE_CODES[b1]);
            i++ //jump to next
            b1 = bytes[i];
        }

        //get the next in the pair if possible
        var b2 = bytes.length > (i + 1) ? bytes[i + 1] : -1;

        codes = codes.concat(codesForChar(b1, b2, barc.currcs));
        //code C takes 2 chars each time
        if (barc.currcs == CODESET.C) i++;
    }

    //calculate checksum according to Code 128 standards
    var checksum = codes[0];
    for (var weight = 1; weight < codes.length; weight++) {
        checksum += (weight * codes[weight]);
    }
    codes.push(checksum % 103);

    codes.push(SET_STOP);

    //encoding should now be complete
    return codes;

    function getBestStartSet(csa1, csa2) {
        //tries to figure out the best codeset
        //to start with to get the most compact code
        var vote = 0;
        vote += csa1 == CODESET.A ? 1 : 0;
        vote += csa1 == CODESET.B ? -1 : 0;
        vote += csa2 == CODESET.A ? 1 : 0;
        vote += csa2 == CODESET.B ? -1 : 0;
        //tie goes to B due to my own predudices
        return vote > 0 ? CODESET.A : CODESET.B;
    }

    function perhapsCodeC(bytes, codeset) {
        for (var i = 0; i < bytes.length; i++) {
            var b = bytes[i]
            if ((b < 48 || b > 57) && b != CHAR_TILDE)
                return codeset;
        }
        return CODESET.C;
    }

    //chr1 is current byte
    //chr2 is the next byte to process. looks ahead.
    function codesForChar(chr1, chr2, currcs) {
        var result = [];
        var shifter = -1;

        if (charCompatible(chr1, currcs)) {
            if (currcs == CODESET.C) {
                if (chr2 == -1) {
                    shifter = SET_CODEB;
                    currcs = CODESET.B;
                }
                else if ((chr2 != -1) && !charCompatible(chr2, currcs)) {
                    //need to check ahead as well
                    if (charCompatible(chr2, CODESET.A)) {
                        shifter = SET_CODEA;
                        currcs = CODESET.A;
                    }
                    else {
                        shifter = SET_CODEB;
                        currcs = CODESET.B;
                    }
                }
            }
        }
        else {
            //if there is a next char AND that next char is also not compatible
            if ((chr2 != -1) && !charCompatible(chr2, currcs)) {
                //need to switch code sets
                switch (currcs) {
                    case CODESET.A:
                        shifter = SET_CODEB;
                        currcs = CODESET.B;
                        break;
                    case CODESET.B:
                        shifter = SET_CODEA;
                        currcs = CODESET.A;
                        break;
                }
            }
            else {
                //no need to shift code sets, a temporary SHIFT will suffice
                shifter = SET_SHIFT;
            }
        }

        //ok some type of shift is nessecary
        if (shifter != -1) {
            result.push(shifter);
            result.push(codeValue(chr2));
        }
        else {
            if (currcs == CODESET.C) {
                //include next as well
                result.push(codeValue(chr1, chr2));
            }
            else {
                result.push(codeValue(chr1));
            }
        }
        barc.currcs = currcs;

        return result;
    }
}

//reduce the ascii code to fit into the Code128 char table
function codeValue(chr1, chr2) {
    if (typeof chr2 == "undefined") {
        return chr1 >= 32 ? chr1 - 32 : chr1 + 64;
    }
    else {
        return parseInt(String.fromCharCode(chr1) + String.fromCharCode(chr2));
    }
}

function charCompatible(chr, codeset) {
    var csa = codeSetAllowedFor(chr);
    if (csa == CODESET.ANY) return true;
    //if we need to change from current
    if (csa == CODESET.AB) return true;
    if (csa == CODESET.A && codeset == CODESET.A) return true;
    if (csa == CODESET.B && codeset == CODESET.B) return true;
    return false;
}

function codeSetAllowedFor(chr) {
    if (chr >= 48 && chr <= 57) {
        //0-9
        return CODESET.ANY;
    }
    else if (chr >= 32 && chr <= 95) {
        //0-9 A-Z
        return CODESET.AB;
    }
    else {
        //if non printable
        return chr < 32 ? CODESET.A : CODESET.B;
    }
}

var Graphics = function(ctx, width, height) {

    this.width = width;
    this.height = height;
    this.quiet = Math.round(this.width / 40);
    
    this.border_size   = 0;
    this.padding_width = 0;

    this.area = {
        width : width - this.padding_width * 2 - this.quiet * 2,
        height: height - this.border_size * 2,
        top   : this.border_size - 4,
        left  : this.padding_width + this.quiet
    };

    this.ctx = ctx;
    this.fg = "#000000";
    this.bg = "#ffffff";

    // fill background
    this.fillBgRect(0,0, width, height);

    // fill center to create border
    this.fillBgRect(0, this.border_size, width, height - this.border_size * 2);
}

//use native color
Graphics.prototype._fillRect = function(x, y, width, height, color) {
    this.ctx.setFillStyle(color)
    this.ctx.fillRect(x, y, width, height)
}

Graphics.prototype.fillFgRect = function(x,y, width, height) {
    this._fillRect(x, y, width, height, this.fg);
}

Graphics.prototype.fillBgRect = function(x,y, width, height) {
    this._fillRect(x, y, width, height, this.bg);
}

var PATTERNS = [
    [2, 1, 2, 2, 2, 2, 0, 0],  // 0
    [2, 2, 2, 1, 2, 2, 0, 0],  // 1
    [2, 2, 2, 2, 2, 1, 0, 0],  // 2
    [1, 2, 1, 2, 2, 3, 0, 0],  // 3
    [1, 2, 1, 3, 2, 2, 0, 0],  // 4
    [1, 3, 1, 2, 2, 2, 0, 0],  // 5
    [1, 2, 2, 2, 1, 3, 0, 0],  // 6
    [1, 2, 2, 3, 1, 2, 0, 0],  // 7
    [1, 3, 2, 2, 1, 2, 0, 0],  // 8
    [2, 2, 1, 2, 1, 3, 0, 0],  // 9
    [2, 2, 1, 3, 1, 2, 0, 0],  // 10
    [2, 3, 1, 2, 1, 2, 0, 0],  // 11
    [1, 1, 2, 2, 3, 2, 0, 0],  // 12
    [1, 2, 2, 1, 3, 2, 0, 0],  // 13
    [1, 2, 2, 2, 3, 1, 0, 0],  // 14
    [1, 1, 3, 2, 2, 2, 0, 0],  // 15
    [1, 2, 3, 1, 2, 2, 0, 0],  // 16
    [1, 2, 3, 2, 2, 1, 0, 0],  // 17
    [2, 2, 3, 2, 1, 1, 0, 0],  // 18
    [2, 2, 1, 1, 3, 2, 0, 0],  // 19
    [2, 2, 1, 2, 3, 1, 0, 0],  // 20
    [2, 1, 3, 2, 1, 2, 0, 0],  // 21
    [2, 2, 3, 1, 1, 2, 0, 0],  // 22
    [3, 1, 2, 1, 3, 1, 0, 0],  // 23
    [3, 1, 1, 2, 2, 2, 0, 0],  // 24
    [3, 2, 1, 1, 2, 2, 0, 0],  // 25
    [3, 2, 1, 2, 2, 1, 0, 0],  // 26
    [3, 1, 2, 2, 1, 2, 0, 0],  // 27
    [3, 2, 2, 1, 1, 2, 0, 0],  // 28
    [3, 2, 2, 2, 1, 1, 0, 0],  // 29
    [2, 1, 2, 1, 2, 3, 0, 0],  // 30
    [2, 1, 2, 3, 2, 1, 0, 0],  // 31
    [2, 3, 2, 1, 2, 1, 0, 0],  // 32
    [1, 1, 1, 3, 2, 3, 0, 0],  // 33
    [1, 3, 1, 1, 2, 3, 0, 0],  // 34
    [1, 3, 1, 3, 2, 1, 0, 0],  // 35
    [1, 1, 2, 3, 1, 3, 0, 0],  // 36
    [1, 3, 2, 1, 1, 3, 0, 0],  // 37
    [1, 3, 2, 3, 1, 1, 0, 0],  // 38
    [2, 1, 1, 3, 1, 3, 0, 0],  // 39
    [2, 3, 1, 1, 1, 3, 0, 0],  // 40
    [2, 3, 1, 3, 1, 1, 0, 0],  // 41
    [1, 1, 2, 1, 3, 3, 0, 0],  // 42
    [1, 1, 2, 3, 3, 1, 0, 0],  // 43
    [1, 3, 2, 1, 3, 1, 0, 0],  // 44
    [1, 1, 3, 1, 2, 3, 0, 0],  // 45
    [1, 1, 3, 3, 2, 1, 0, 0],  // 46
    [1, 3, 3, 1, 2, 1, 0, 0],  // 47
    [3, 1, 3, 1, 2, 1, 0, 0],  // 48
    [2, 1, 1, 3, 3, 1, 0, 0],  // 49
    [2, 3, 1, 1, 3, 1, 0, 0],  // 50
    [2, 1, 3, 1, 1, 3, 0, 0],  // 51
    [2, 1, 3, 3, 1, 1, 0, 0],  // 52
    [2, 1, 3, 1, 3, 1, 0, 0],  // 53
    [3, 1, 1, 1, 2, 3, 0, 0],  // 54
    [3, 1, 1, 3, 2, 1, 0, 0],  // 55
    [3, 3, 1, 1, 2, 1, 0, 0],  // 56
    [3, 1, 2, 1, 1, 3, 0, 0],  // 57
    [3, 1, 2, 3, 1, 1, 0, 0],  // 58
    [3, 3, 2, 1, 1, 1, 0, 0],  // 59
    [3, 1, 4, 1, 1, 1, 0, 0],  // 60
    [2, 2, 1, 4, 1, 1, 0, 0],  // 61
    [4, 3, 1, 1, 1, 1, 0, 0],  // 62
    [1, 1, 1, 2, 2, 4, 0, 0],  // 63
    [1, 1, 1, 4, 2, 2, 0, 0],  // 64
    [1, 2, 1, 1, 2, 4, 0, 0],  // 65
    [1, 2, 1, 4, 2, 1, 0, 0],  // 66
    [1, 4, 1, 1, 2, 2, 0, 0],  // 67
    [1, 4, 1, 2, 2, 1, 0, 0],  // 68
    [1, 1, 2, 2, 1, 4, 0, 0],  // 69
    [1, 1, 2, 4, 1, 2, 0, 0],  // 70
    [1, 2, 2, 1, 1, 4, 0, 0],  // 71
    [1, 2, 2, 4, 1, 1, 0, 0],  // 72
    [1, 4, 2, 1, 1, 2, 0, 0],  // 73
    [1, 4, 2, 2, 1, 1, 0, 0],  // 74
    [2, 4, 1, 2, 1, 1, 0, 0],  // 75
    [2, 2, 1, 1, 1, 4, 0, 0],  // 76
    [4, 1, 3, 1, 1, 1, 0, 0],  // 77
    [2, 4, 1, 1, 1, 2, 0, 0],  // 78
    [1, 3, 4, 1, 1, 1, 0, 0],  // 79
    [1, 1, 1, 2, 4, 2, 0, 0],  // 80
    [1, 2, 1, 1, 4, 2, 0, 0],  // 81
    [1, 2, 1, 2, 4, 1, 0, 0],  // 82
    [1, 1, 4, 2, 1, 2, 0, 0],  // 83
    [1, 2, 4, 1, 1, 2, 0, 0],  // 84
    [1, 2, 4, 2, 1, 1, 0, 0],  // 85
    [4, 1, 1, 2, 1, 2, 0, 0],  // 86
    [4, 2, 1, 1, 1, 2, 0, 0],  // 87
    [4, 2, 1, 2, 1, 1, 0, 0],  // 88
    [2, 1, 2, 1, 4, 1, 0, 0],  // 89
    [2, 1, 4, 1, 2, 1, 0, 0],  // 90
    [4, 1, 2, 1, 2, 1, 0, 0],  // 91
    [1, 1, 1, 1, 4, 3, 0, 0],  // 92
    [1, 1, 1, 3, 4, 1, 0, 0],  // 93
    [1, 3, 1, 1, 4, 1, 0, 0],  // 94
    [1, 1, 4, 1, 1, 3, 0, 0],  // 95
    [1, 1, 4, 3, 1, 1, 0, 0],  // 96
    [4, 1, 1, 1, 1, 3, 0, 0],  // 97
    [4, 1, 1, 3, 1, 1, 0, 0],  // 98
    [1, 1, 3, 1, 4, 1, 0, 0],  // 99
    [1, 1, 4, 1, 3, 1, 0, 0],  // 100
    [3, 1, 1, 1, 4, 1, 0, 0],  // 101
    [4, 1, 1, 1, 3, 1, 0, 0],  // 102
    [2, 1, 1, 4, 1, 2, 0, 0],  // 103
    [2, 1, 1, 2, 1, 4, 0, 0],  // 104
    [2, 1, 1, 2, 3, 2, 0, 0],  // 105
    [2, 3, 3, 1, 1, 1, 2, 0]   // 106
]

