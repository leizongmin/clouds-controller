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

  this._debug('create');
}

utils.inheritsEventEmitter(DataProtocol);

// 接收到数据
DataProtocol.prototype._onData = function (data) {
  this._debug('receiving data: data=%s, length=%s', data, data.length);
  var current;
  for (var i = 0; i < data.length; i++) {
    if (data[i] === 13 && data[i + 1] === 10) {
      current = Buffer.concat([this._buffer, data.slice(0, i)]);
      this._buffer = data.slice(i + 2);
      break;
    }
  }
  if (current) this._parseData(current);
};

// 接收到一条命令
DataProtocol.prototype._parseData = function (data) {
  data = data.toString();
  var t = data[0];
  var d = data.slice(2);
  this._debug('parse data: data=%s, t=%s', data, t);
  if (t === 'C') {
    this.emit('message.command', d);
  } else if (t === 'T') {
    var i = d.indexOf('\t');
    if (i === -1) i = d.length;
    this.emit('message.to', d.slice(0, i), d.slice(i + 1));
  } else if (t === 'I') {
    this.emit('message.id', d);
  } else if (t === 'E') {
    this.emit('message.error', d);
  } else if (t === 'R') {
    this.emit('message.ready', d);
  } else {
    this.emit('message.unknown', data);
  }
};

// 打包要发送的数据
DataProtocol.prototype._pack = function (data) {
  return new Buffer(data + '\r\n');
};

DataProtocol.prototype._send = function (data) {
  this._debug('send: data=%s, length=%s', data, data.length);
  this._socket.write(this._pack(data));
};

/**
 * 发送准备就绪
 *
 * @param {String} data
 */
DataProtocol.prototype.sendReady = function (data) {
  data = data || 'Welcome';
  this._send('R:' + data);
};

/**
 * 发送命令
 *
 * @param {String} data
 */
DataProtocol.prototype.sendCommand = function (data) {
  this._send('C:' + data);
};

/**
 * 发送客户端ID
 *
 * @param {String} data
 */
DataProtocol.prototype.sendId = function (id) {
  id = id || this.id;
  this._debug('send ID: %s', id);
  this._send('I:' + id);
};

/**
 * 发送出错信息
 *
 * @param {String} data
 */
DataProtocol.prototype.sendError = function (err) {
  this._debug('send error: %s', err);
  this._send('E:' + err);
};

/**
 * 发送消息给别的客户端
 *
 * @param {String} receiver
 * @param {String} data
 */
DataProtocol.prototype.sendTo = function (receiver, data) {
  this._debug('send to: receiver=%s, data=%s', receiver, data);
  this._send('T:' + receiver + '\t' + data);
};


module.exports = DataProtocol;
