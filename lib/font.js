const font = {glyphs: []};

const fs = require("fs");
const pngjs = require("pngjs");
const PARAM = {
  INFO: 'info',
  COMMON: 'common',
  PAGE: 'page',
  CHAR: 'char'
}

function Font(name) {
  var fnt = fs.readFileSync(`font/${name}.fnt`).toString().split("\n");
  for (var line of fnt) {
    var params = decode(line);
    if (params) {
      switch(params.type) {
        case PARAM.INFO: {
          console.log(`Loading ${params.face} size ${params.size}`);
          break;
        }
        case PARAM.COMMON: {
          font.lineHeight = Number(params.lineHeight);
          font.base = Number(params.base);
          font.width = Number(params.scaleW);
          font.height = Number(params.scaleH);
          break;
        }
        case PARAM.PAGE: {
          var data = fs.readFileSync(`font/${params.file}`);
          var png = pngjs.PNG.sync.read(data);
          font.buffer = new Uint32Array(png.data.buffer);
          break;
        }
        case PARAM.CHAR: {
          font.glyphs[Number(params.id)] = {
            x: Number(params.x),
            y: Number(params.y),
            width: Number(params.width),
            height: Number(params.height),
            xoffset: Number(params.xoffset), 
            yoffset: Number(params.yoffset),
            xadvance: Number(params.xadvance)
          };
          break;
        }
      }
    }
  }
}

function decode(line) {
  while (line.length == 0) {
    return;
  }
  var result = {};

  var o = 0;
  var i = line.indexOf(' ');
  result.type = line.substring(0, i);

  o = i + 1;
  while (o < line.length) {
    i = line.indexOf('=', o);
    var param = line.substring(o, i);
    o = i + 1;

    var value;
    if (line.charAt(o) == '"') {
      i = line.indexOf('"', o + 1);
      if (i == -1) i = line.length;
      value = line.substring(o + 1, i);
      o = i + 2;
    } else {
      i = line.indexOf(' ', o);
      if (i == -1) i = line.length;
      value = line.substring(o, i);
      o = i + 1;
    }

    result[param] = value;
  }
  return result;
}

Font.prototype.lineHeight = () => font.lineHeight;

Font.prototype.draw = (pixels, width, ox, oy, string) => {
  for (var i = 0; i < string.length; i++) {
    var char = string.charCodeAt(i);
    var glyph = font.glyphs[Number(char)];
    var w = font.width;

    for (var y = 0; y < glyph.height; y++) {
      for (var x = 0; x < glyph.width; x++) {
        var j = ((y + glyph.y) * w) + x + glyph.x;
        var p = font.buffer[j];
        if (p > 0) {
          var color = p >> 8 + p >> 16 + p >> 24;

          var q = ((oy + y + glyph.yoffset) * width) + ox + x + glyph.xoffset;
          pixels[q] = color;
        }
      }
    }
    ox += glyph.xadvance;
  }
}

module.exports = Font;
