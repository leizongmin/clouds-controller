/**
 * clouds-controller server
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var net = require('net');
var define = require('./define');
var utils = require('./utils');
var Protocol = require('./protocol');


/**
 * Server
 *
 * @param {Object} options
 */
function Server (options) {
  options = options || {};

  var ns = this._ns = utils.createNamespace(options);
  var id = this.id = options.id || utils.uniqueId('server');
  var debug = this._debug = utils.debug('server:' + id);
  var me = this;

  var server = this._server = new net.Server();
  server.on('error', function (err) {
    me._debug('emit error: %s', err);
    me.emit('error', err);
  });
  server.on('close', function () {
    me._debug('emit close');
    me.emit('close');
  });
  server.on('listening', function () {
    me._debug('emit listening');
    me.emit('listening');
  });
  server.on('connection', function (s) {
    me._debug('emit connection [%s] %s:%s', s.remoteFamily, s.remoteAddress, s.remotePort);
    me.emit('connection', s);
    me._handleNewConnection(s);
  });

  this._clients = {};
  this._keys = {};

  debug('created');
}

utils.inheritsEventEmitter(Server);

Server.prototype._socketId = function (s) {
  return [s.remoteFamily, s.remoteAddress, s.remotePort].join(':');
};

// 处理默认的回调函数
Server.prototype._callback = function (fn) {
  if (typeof fn !== 'function') {
    var debug = this._debug;
    fn = function (err) {
      debug('callback: err=%s, args=%s', err, Array.prototype.slice.call(arguments));
    };
  }
  return fn;
};

// 处理新的连接请求
Server.prototype._handleNewConnection = function (socket) {
  var me = this;
  var debug = utils.debug('server:' + me.id + ':' + me._socketId(socket));
  var id = null;
  var protocol = new Protocol(me.id, socket);

  protocol.on('message.id', function (d) {
    id= d;
    debug('client ID: %s', id);
    me._registerClient(id, protocol, socket);
    protocol.sendReady('Welome ' + id);
  });

  protocol.on('message.command', function (data) {
    if (!id) return protocol.sendError('please register your client ID firstly');
  });

  protocol.on('message.to', function (receiver, data) {
    debug('client send to: receiver=%s, data=%s', receiver, data);
    var p = me._getClientProtocol(receiver);
    if (!p) return protocol.sendError('client ' + receiver + ' is offline');
    p.sendCommand(data);
  });

  protocol.on('message.error', function (err) {
    debug('client error: %s', err);
  });

  socket.on('close', function () {
    debug('on close');
    clientDisconnect();
  });
  socket.on('error', function (err) {
    debug('on error: %s', err);
    clientDisconnect();
  });
  socket.on('end', function () {
    debug('on end');
    clientDisconnect();
  });

  function clientDisconnect () {
    debug('client disconnect');
    me._removeClient(id);
  }
};

Server.prototype._registerClient = function (id, protocol, socket) {
  this._debug('register client: %s', id);
  this._clients[id] = {
    protocol: protocol,
    socket: socket
  };
};

Server.prototype._removeClient = function (id) {
  this._debug('remove client: %s', id);
  delete this._clients[id];
};

Server.prototype._getClientProtocol = function (id) {
  var c = this._clients[id];
  return c && c.protocol;
};

/**
 * 监听端口
 *
 * @param {Number} port
 * @param {String} host
 */
Server.prototype.listen = function (port, host) {
  port = port || define.port;
  host = host || define.host;
  this._debug('listen: %s:%s', host, port);
  this._server.listen(port, host);
};

/**
 * 退出
 *
 * @param {Function} callback
 */
Server.prototype.exit = function (callback) {
  this._debug('exit');

  // 触发exit事件
  this.emit('exit', this);

  this._server.close(this._callback(callback));
};


module.exports = Server;
