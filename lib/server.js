/**
 * clouds-controller server
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var net = require('net');
var define = require('./define');
var utils = require('./utils');
var Protocol = require('./protocol');
var KeyStatus = require('./keys');


/**
 * Server
 *
 * @param {Object} options
 *   - {String} id
 */
function Server (options) {
  options = utils.clone(options || {});

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
  this._clientCounter = 0;
  this._keyStatus = new KeyStatus(options);

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
  var debug = utils.debug('server:' + me.id + ':socket:' + me._socketId(socket));
  var id = null;
  var protocol = new Protocol(me.id, socket);
  var keyStatus = me._keyStatus;

  protocol.on('message.id', function (d) {
    id= d;
    debug('client ID: %s', id);
    me._registerClient(id, protocol, socket);
    protocol.sendReady('Welome ' + id);
  });

  protocol.on('message.command', function (data, mid) {
    if (!id) return protocol.sendError('please register your client ID firstly');
    var args;
    try {
      args = JSON.parse(data);
    } catch (err) {
      return protocol.sendError('bad command format: ' + data + '\n' + err);
    }
    var op = args[0];
    args = args.slice(1);
    if (op) {
      execCommand(op, args, mid);
    } else {
      protocol.sendError('bad command format: ' + data);
    }
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

  function clientDisconnect () {
    debug('client disconnect');
    me._removeClient(id);
  }

  function execCommand (op, args, mid) {
    debug('exec command: %s(%s)', op, args);
    var ret;
    switch (op.toLowerCase()) {
      case 'set':
        ret = keyStatus.set(args[0], args[1]);
        break;
      case 'del':
        ret = keyStatus.del(args[0]);
        break;
      case 'keys':
        ret = keyStatus.keys(args[0]);
        break;
      default:
        return protocol.sendError('unknown command: ' + op);
    }
    protocol.sendResponse(mid, JSON.stringify(ret));
  }
};

Server.prototype._registerClient = function (id, protocol, socket) {
  this._debug('register client: %s', id);
  this._clients[id] = {
    protocol: protocol,
    socket: socket
  };
  this._clientCounter++;
  this.emit('client ready', protocol, socket);
};

Server.prototype._removeClient = function (id) {
  this._debug('remove client: %s', id);
  if (this._clients[id]) {
    this._debug('destroy client socket: %s', this._socketId(this._clients[id].socket));
    this._clients[id].socket.destroy();
  }
  delete this._clients[id];
  this._clientCounter--;
  this.emit('client removed', id);
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
