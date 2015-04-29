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
  this._debug('receiving %s bytes', data.length);
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
  this._debug('emit message: %s', data);
  data = data.toString();
  var t = data[0];
  var d = data.slice(2);
  if (t === 'M') this.emit('message', d);
  else if (t === 'I') this.emit('message.id', d);
  else if (t === 'E') this.emit('message.error', d);
  else this.emit('message.unknown', data);
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
 * 发送命令
 *
 * @param {String} data
 */
DataProtocol.prototype.send = function (data) {
  this._send('M:' + data);
};

DataProtocol.prototype.sendId = function (id) {
  id = id || this.id;
  this._debug('send ID: %s', id);
  this._send('I:' + id);
};

DataProtocol.prototype.sendError = function (err) {
  this._debug('send error: %s', err);
  this._send('E:' + err);
};


module.exports = DataProtocol;
