/**
 * clouds-controller connection
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var net = require('net');
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
  options = options || {};

  var ns = this._ns = utils.createNamespace(options);
  var id = this.id = options.id || utils.uniqueId('connection');
  var debug = this._debug = utils.debug('connection:' + id);
  var me = this;

  // create controller connection
  options.controller = options.controller || {};
  this._host = options.controller.host || define.host;
  this._port = options.controller.port || define.port;
  this._reconnect();
}

utils.inheritsEventEmitter(Connection);

Connection.prototype._reconnect = function () {
  var me = this;
  me._debug('connect to %s:%s', this._host, this._port);

  var socket = this._socket = new net.Socket();
  var protocol = this._protocol = new Protocol(me.id, socket);

  socket.connect(this._port, this._host, function () {
    me._debug('emit connect');
    me.emit('connect');
    protocol.sendId(me.id);
  });

  socket.on('close', function () {
    me._debug('socket close');
    me._reconnect();
  });

  socket.on('end', function () {
    me._debug('socket end');
    me._reconnect();
  });

  socket.on('error', function (err) {
    me._debug('socket error: %s', err);
    me._reconnect();
  });

  protocol.on('message.ready', function (msg) {
    me._debug('on ready message: %s', msg);
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
  var newKey = this._key(key);
  this._debug('registerKey: key=%s, newKey=%s, ttl=%s', key, newKey, ttl);
  this._redis('publish').setex(newKey, ttl, 1, function (err) {
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
  var newKey = this._key(key);
  this._debug('deleteKey: key=%s, newKey=%s', key, newKey);
  this._redis('publish').del(newKey, function (err) {
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
  this._debug('deleteKeys: keys=%s', keys);
  var op = this._redis('publish').multi();
  keys.forEach(function (key) {
    op.del(key);
  });
  op.exec(function (err) {
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
  this._redis('publish').keys(newKey, callback);
};

/**
 * 退出
 *
 * @param {Function} callback
 */
Connection.prototype.exit = function (callback) {
  this._debug('exit');

  // 关闭redis连接
  this._debug('exit: close redis connection');
  this._redis('publish').end();
  this._redis('subscribe').end();

  // 触发exit事件
  this.emit('exit', this);

  if (callback) callback();
};


module.exports = Connection;
