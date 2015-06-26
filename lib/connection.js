/**
 * clouds-controller connection
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var net = require('net');
var async = require('async');
var define = require('./define');
var utils = require('./utils');
var Protocol = require('./protocol');


/**
 * Clouds Connection
 *
 * @param {Object} options
 *   - {String} id
 *   - {Object} controller
 *     - {Number} port
 *     - {String} host
 */
function Connection (options) {
  options = utils.clone(options || {});

  var ns = this._ns = utils.createNamespace(options);
  var id = this.id = options.id || utils.uniqueId('connection');
  var debug = this._debug = utils.debug('connection:' + id);
  var me = this;

  // create controller connection
  options.controller = options.controller || {};
  this._host = options.controller.host || define.host;
  this._port = options.controller.port || define.port;
  process.nextTick(function () {
    me._debug('trying reconnect');
    me._reconnect();
  });

  me._queue = [];
  ['send', 'registerKey', 'deleteKey', 'deleteKeys', 'keys'].forEach(function (method) {
    me[method] = me._wrapMethod(me[method], method);
  });
  me.on('ready', function () {
    me._debug('emit listen');
    me.emit('listen');
    me._processQueue();
  });
}

utils.inheritsEventEmitter(Connection);

// 如果未连接成功
Connection.prototype._wrapMethod = function (fn, method) {
  return function () {
    if (this._ready) {
      return fn.apply(this, arguments);
    }
    var args = Array.prototype.slice.call(arguments);
    this._debug('add to queue: %s(%s)', method, args);
    this._queue.push([fn, args]);
  };
};

Connection.prototype._processQueue = function () {
  var me = this;
  this._debug('process queue: length=%s', this._queue.length);
  this._queue.forEach(function (item) {
    item[0].apply(me, item[1]);
  });
  this._queue = [];
};

Connection.prototype._reconnect = function () {
  if (this._exited) return;
  if (this._connecting) return;

  var me = this;
  me._debug('connect to %s:%s', this._host, this._port);

  var socket = this._socket = new net.Socket();
  var protocol = this._protocol = new Protocol(me.id, socket);

  this._connecting = true;
  this._ready = false;
  socket.connect(this._port, this._host, function () {
    me._debug('emit connect');
    me._connecting = false;
    me.emit('connect');
    protocol.sendId(me.id);
  });

  socket.once('close', function () {
    me._debug('socket close');
    setTimeout(function () {
      me._connecting = false;
      me._reconnect();
    }, define.reconnectDelay);
  });

  socket.once('error', function (err) {
    me._debug('socket error: %s', err);
    setTimeout(function () {
      me._connecting = false;
      me._reconnect();
    }, define.reconnectDelay);
  });

  protocol.once('message.ready', function (msg) {
    me._debug('on ready message: %s', msg);
    me._ready = true;
    me._debug('emit ready: %s', msg);
    me.emit('ready', msg);
  });

  protocol.on('message.error', function (err) {
    me._debug('on error message: %s', err);
    me.emit('message.error', err);
  });

  protocol.on('message.command', function (data) {
    me._debug('on command message: %s', data);
    me.emit('message', data);
  });
};

// 获得redis key
Connection.prototype._key = function (key) {
  var list = Array.prototype.slice.call(arguments);
  if (this._prefix) list.unshift(this._prefix);
  return list.join(':');
};

// 处理默认的回调函数
Connection.prototype._callback = function (fn) {
  if (typeof fn !== 'function') {
    var debug = this._debug;
    fn = function (err) {
      debug('callback: err=%s, args=%s', err, Array.prototype.slice.call(arguments));
    };
  }
  return fn;
};

Connection.prototype._sendCommand = function (data, callback) {
  var json;
  try {
    json = JSON.stringify(data);
  } catch (err) {
    return callback(err);
  }
  this._debug('send command: %s', data);
  this._protocol.sendCommand(json, callback);
};

/**
 * 发送消息
 *
 * @param {String} receiver
 * @param {String} data
 * @param {Function} callback
 */
Connection.prototype.send = function (receiver, data, callback) {
  this._debug('send: receiver=%s, data=%s', receiver, data);
  this._protocol.sendTo(receiver, data, this._callback(callback));
};

/**
 * 注册一个Key
 *
 * @param {String} key
 * @param {Number} ttl
 * @param {Function} callback
 */
Connection.prototype.registerKey = function (key, ttl, callback) {
  callback = this._callback(callback);
  var newKey = this._key(key);
  this._debug('registerKey: key=%s, newKey=%s, ttl=%s', key, newKey, ttl);
  this._sendCommand(['set', newKey, ttl], function (err) {
    callback(err, key);
  });
};

/**
 * 删除一个Key
 *
 * @param {String} key
 * @param {Function} callback
 */
Connection.prototype.deleteKey = function (key, callback) {
  callback = this._callback(callback);
  var newKey = this._key(key);
  this._debug('deleteKey: key=%s, newKey=%s', key, newKey);
  this._sendCommand(['del', newKey], function (err) {
    callback(err, key);
  });
};

/**
 * 删除一组Key
 *
 * @param {Array} keys
 * @param {Function} callback
 */
Connection.prototype.deleteKeys = function (keys, callback) {
  callback = this._callback(callback);
  this._debug('deleteKeys: keys=%s', keys);
  var me = this;
  async.mapSeries(keys, function (k, next) {
    me._sendCommand(['del', k], next);
  }, function (err) {
    callback(err, keys);
  });
};

/**
 * 列出符合要求的key
 *
 * @param {String} pattern
 * @param {Function} callback
 */
Connection.prototype.keys = function (pattern, callback) {
  var newKey = this._key(pattern);
  this._debug('keys: pattern=%s, newKey=%s', pattern, newKey);
  this._sendCommand(['keys', newKey], callback);
};

/**
 * 退出
 *
 * @param {Function} callback
 */
Connection.prototype.exit = function (callback) {
  this._debug('exit');

  if (!this._socket) {
    this._debug('no socket connection');
    this.emit('exit', this);
    if (callback) callback();
  }

  var me = this;
  me._exited = true;
  me._socket.destroy();

  process.nextTick(function () {
    me.emit('exit', me);
    if (callback) callback();
  });
};


module.exports = Connection;
