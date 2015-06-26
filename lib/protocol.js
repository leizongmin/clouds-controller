/**
 * clouds-controller protocol
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var define = require('./define');
var utils = require('./utils');


/**
 * DataProtocol
 *
 * @param {String} id
 * @param {Object} socket
 */
function DataProtocol (id, socket) {
  this.id = id;
  this._socket = socket;
  this._buffer = new Buffer(0);
  this._debug = utils.debug('protocol:' + id);
  var me = this;

  socket.on('data', function (data) {
    me._onData(data);
  });

  this._midCounter = 0;
  this._msgCallback = {};

  this._debug('create');
}

utils.inheritsEventEmitter(DataProtocol);

// 生成一个mid
DataProtocol.prototype._getMid = function () {
  // 36进制，mid为4位
  this._midCounter++;
  if (this._midCounter > 1679615) this._midCounter = 1;
  var id = (this._midCounter).toString(36);
  return '0000'.slice(0, 4 - id.length) + id;
};

// 接收到数据
DataProtocol.prototype._onData = function (data) {
  this._debug('receiving data: data=%s, length=%s', data, data.length);
  this._buffer = Buffer.concat([this._buffer, data]);
  while (this._buffer.length > 0) {
    if (!this._parseNextMessage()) break;
  }
};

// 从收到的数据中解析一条
DataProtocol.prototype._parseNextMessage = function () {
  this._debug('parse next message: buffer length=%s', this._buffer.length);
  var current;
  var data = this._buffer;
  for (var i = 0; i < data.length; i++) {
    if (data[i] === 13 && data[i + 1] === 10) {
      current = data.slice(0, i);
      this._buffer = data.slice(i + 2);
      break;
    }
  }
  if (current) {
    this._parseMessage(current);
    return true;
  } else {
    return false;
  }
};

// 解析一条消息
DataProtocol.prototype._parseMessage = function (data) {
  data = data.toString();
  var mid = data.slice(0, 4);
  var t = data[4];
  var d = data.slice(6);
  this._debug('parse data: mid=%s, d=%s, t=%s', mid, d, t);
  if (t === 'r') {
    this._emitResponse(d, mid);
  } else if (t === 'C') {
    this.emit('message.command', d, mid);
  } else if (t === 'T') {
    var i = d.indexOf('\t');
    if (i === -1) i = d.length;
    this.emit('message.to', d.slice(0, i), d.slice(i + 1), mid);
  } else if (t === 'I') {
    this.emit('message.id', d, mid);
  } else if (t === 'E') {
    this.emit('message.error', d, mid);
  } else if (t === 'R') {
    this.emit('message.ready', d, mid);
  } else {
    this.emit('message.unknown', data, mid);
  }
};

// 消息响应回调
DataProtocol.prototype._emitResponse = function (data, mid) {
  var omid = data.slice(0, 4);
  var d;
  try {
    d = JSON.parse(data.slice(5));
  } catch (err) {
    this._debug('_emitResponse: parse error: %s', err);
    return;
  }
  var callback = this._msgCallback[omid];
  if (typeof callback !== 'function') return;
  this._debug('msg callback: omid=%s, data=%s', omid, d);
  callback(null, d);
};

// 打包要发送的数据
DataProtocol.prototype._pack = function (mid, data) {
  return new Buffer(mid + data + '\r\n');
};

DataProtocol.prototype._send = function (data, callback) {
  var mid = this._getMid();
  if (callback) this._msgCallback[mid] = callback;
  this._debug('send: mid=%s, data=%s, length=%s [callback=%s]', mid, data, data.length, !!callback);
  this._socket.write(this._pack(mid, data));
};

/**
 * 发送准备就绪
 *
 * @param {String} data
 * @param {Function} callback
 */
DataProtocol.prototype.sendReady = function (data, callback) {
  data = data || 'Welcome';
  this._send('R:' + data, callback);
};

/**
 * 发送命令
 *
 * @param {String} data
 * @param {Function} callback
 */
DataProtocol.prototype.sendCommand = function (data, callback) {
  this._send('C:' + data, callback);
};

/**
 * 发送客户端ID
 *
 * @param {String} data
 * @param {Function} callback
 */
DataProtocol.prototype.sendId = function (id, callback) {
  id = id || this.id;
  this._debug('send ID: %s', id);
  this._send('I:' + id, callback);
};

/**
 * 发送出错信息
 *
 * @param {String} data
 * @param {Function} callback
 */
DataProtocol.prototype.sendError = function (err, callback) {
  this._debug('send error: %s', err);
  this._send('E:' + err, callback);
};

/**
 * 发送消息给别的客户端
 *
 * @param {String} receiver
 * @param {String} data
 * @param {Function} callback
 */
DataProtocol.prototype.sendTo = function (receiver, data, callback) {
  this._debug('send to: receiver=%s, data=%s', receiver, data);
  this._send('T:' + receiver + '\t' + data, callback);
};

/**
 * 发送回应
 *
 * @param {String} mid
 * @param {String} data
 * @param {Function} callback
 */
DataProtocol.prototype.sendResponse = function (mid, data, callback) {
  this._debug('response to: mid=%s, data=%s', mid, data);
  this._send('r:' + mid + '\t' + data, callback);
};


module.exports = DataProtocol;
