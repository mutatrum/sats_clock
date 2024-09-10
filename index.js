'use strict';

const Font = require('./lib/font');
const Color = require('./lib/color');

const font = new Font('DroidSansMono-32');
const color = new Color();

const WIDTH = 720;
const HEIGHT = 720;

const COLUMNS = 10;
const GRID = 10;
const DOT = 5;
const DOT_GAP = 1;
const GRID_GAP = 5;
const BLOCK = (DOT * 10) + (DOT_GAP * 9) + GRID_GAP;

const BORDER = 25;
const RADIUS = 25;

var pixels, buffer, fb, input;
var currentSats;

var drag = false;
var x, y = -1;

(async function () {

  function exitHandler(options, exitCode) {
    console.log(`exitHander: ${options.status}`)
    if (options.cleanup) {
      if (fb) {
        fb.blank(true);
      }
    }
    if (exitCode && exitCode !== 0) console.log(exitCode);
    if (options.exit) process.exit();
    if (options.reconnect) initWebSocket();
  }
  
  process.on('exit', exitHandler.bind(null, {status: 'exit', exit:true, cleanup:true}));
  process.on('SIGINT', exitHandler.bind(null, {status: 'SIGINT', exit:true}));
  process.on('SIGUSR1', exitHandler.bind(null, {status: 'SIGUSR1', exit:true}));
  process.on('SIGUSR2', exitHandler.bind(null, {status: 'SIGUSR2', exit:true}));
  process.on('uncaughtException', exitHandler.bind(null, {status: 'uncaughtException', reconnect:true}));

  const InputEvent = require('input-event');
 
  input = new InputEvent('/dev/input/event0');
   
  const mouse = new InputEvent.Mouse(input);
   
  mouse.on('touch', (event) => {
    switch(event.code) {
      case 0x00: 
        x = event.value;
        if (drag && y != -1) {
          console.log(`${x} ${y}`);
        }
        break;
      case 0x01: 
        y = event.value;
        if (drag && x != -1) {
          console.log(`${x} ${y}`);
        }
        break;
      case 0x39:
        drag = event.value != -1;
        if (!drag) {
          x = -1;
          y = -1;
        }
        break;
      // default:
      //   console.log(JSON.stringify(event));
      //   break;
    }
  });

  initFramebuffer();
  initWebSocket();
  setInterval(() => update(currentSats), 250);
})();

function initFramebuffer() {
  const framebuffer = require('framebuffer');
  fb = new framebuffer('/dev/fb0');
  console.log(fb.toString());

  buffer = new Uint32Array(fb.fbp.buffer);
  pixels = new Uint32Array(HEIGHT * WIDTH);

  fb.blank(false);
  buffer.fill(0);
}

function initWebSocket() {
  var lastdata = Date.now();

  var WebSocketClient = require('websocket').client;

  var client = new WebSocketClient();

  client.on('connectFailed', function(error) {
      console.log('Connect Error: ' + error.toString());
      connect(client, 5000)
  });

  client.on('connect', function(connection) {
      console.log('WebSocket Client Connected');
      connection.on('error', function(error) {
          console.log("Connection Error: " + error.toString());
          connect(client, 5000)
      });
      connection.on('close', function() {
          console.log('Connection Closed');
          connect(client, 5000)
      });
      connection.on('message', function(message) {
          handleMessage(JSON.parse(message.utf8Data));
      });

      function subscribe() {
          if (connection.connected) {
              var message = {
                  event: 'subscribe',
                  channel: 'ticker', 
                  symbol: 'BTCUSD'
              };
              var payload = JSON.stringify(message)
              setStatus(`Subscribe ${payload}`)
              connection.sendUTF(payload);

              lastdata = Date.now();
          }
      }
      subscribe();
  });

  connect(client, 0)

  setInterval(() => {
    if (lastdata == 0) return

    if (Date.now() - lastdata > 60000) client.close()
  }, 10000)
}

function connect(client, after) {
  setTimeout(() => client.connect('wss://api-pub.bitfinex.com/ws/2'), after);
}

function handleMessage(data) {
  if (Array.isArray(data)) {
    var message = data[1];
    if (Array.isArray(message)) {
      var price = message[6];
      currentSats = Math.floor(1e8 / price);
      // console.log(`${currentSats} sats per dollar`);
    }
  }
  else {
    setStatus(`WebSocket: ${JSON.stringify(data)}`);
  }
}

function setStatus(status) {
  console.log(status);
}

function update(sats) {
  if (!sats) {
    return;
  }

  pixels.fill(0);

  var width = getWidth();
  var height = getHeight(sats);

  drawBackground(pixels, width, height);

  drawDots(pixels, width, height, sats);

  var lineHeight = font.lineHeight();

  var ox = ((WIDTH - width) >> 1);
  var oy = ((HEIGHT - height) >> 1) - BORDER - lineHeight;

  font.draw(pixels, WIDTH, ox, oy, sats.toString());

  font.draw(pixels, WIDTH, ox, oy - lineHeight, 'sats per dollar');

  buffer.set(pixels);

  color.next();
}

function getHeight(sats) {
  var rows = Math.ceil(sats / (COLUMNS * 100));
  return (rows * 10 * DOT) + (rows * 9 * DOT_GAP) + ((rows - 1) * GRID_GAP);
}

function getWidth() {
  return (COLUMNS * 10 * DOT) + (COLUMNS * 9 * DOT_GAP) + ((COLUMNS - 1) * GRID_GAP);
}

function drawBackground(pixels, width, height) {
  var background = color.background();
  width += BORDER * 2;
  height += BORDER * 2;

  var ox = (WIDTH - width) >> 1;
  var oy = (HEIGHT - height) >> 1;

  var circle = getCircle()

  var x = ox + ((oy + RADIUS) * WIDTH);
  for (var i = 0; i <= height - RADIUS - RADIUS; i++) {
    pixels.fill(background, x, x + width);
    x += WIDTH;
  }
  var x = ox + RADIUS + (oy * WIDTH);
  var x2 = (height - RADIUS) * WIDTH;
  for (var i = 0; i < RADIUS; i++) {
    var c1 = circle[RADIUS - i];
    pixels.fill(background, x - c1, x + width + c1 - RADIUS - RADIUS);
    var c2 = circle[i];
    pixels.fill(background, x + x2 - c2, x + x2 + width + c2 - RADIUS - RADIUS);
    x += WIDTH;
  }
}

function drawDots(pixels, width, height, sats) {
  var foreground = color.foreground();

  var ox = (WIDTH - width) >> 1;
  var oy = (HEIGHT - height) >> 1;

  var ax = 0, ay = 0, bx = 0, by = 0;

  for (var i = 0; i < sats; i++) {

    var x = ox + (ax * (DOT + DOT_GAP)) + (bx * BLOCK);
    var y = oy + (ay * (DOT + DOT_GAP)) + (by * BLOCK);
    
    dot(pixels, x, y, foreground);
    
    ax++;
    if (ax == GRID) {
      ax = 0;
      ay++;
    }
    
    if (ay == GRID) {
      bx++;
      ay = 0;
    }
    
    if (bx == COLUMNS) {
      by++;
      bx = 0;
    }
  }
}

function getCircle() {
  var circle = new Array(RADIUS);
  circle[0] = RADIUS;

  var x = 0;
  var y = RADIUS;
  var d = 3 - (2 * RADIUS);
 
  while(x <= y) {
    if(d <= 0) {
      d = d + (4 * x) + 6;
    } else {
      d = d + (4 * x) - (4 * y) + 10;
      y--;
    }
    x++;

    circle[x] = y;
    circle[y] = x;
  }

  return circle;
}

function dot(pixels, x, y, color) {
  var p = (y * WIDTH) + x;
  for (var i = 0; i < DOT; i++) {
    pixels.fill(color, p, p + DOT);
    p += WIDTH;
  }
}
