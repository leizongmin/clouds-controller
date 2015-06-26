/**
 * clouds-controller connection
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var util = require('util');
var events = require('events');
var os = require('os');
var leiNS = require('lei-ns');
var createDebug = require('debug');
var utils = require('lei-utils');
var clone = require('clone');
var define = require('./define');
module.exports = exports = utils.merge(utils, exports);


exports.debug = function (n) {
  return createDebug('clouds-controller:' + n);
};

exports.createNamespace = function (data) {
  var ns = new leiNS.Namespace();
  Object.keys(data).forEach(function (k) {
    ns(k, data[k]);
  });
  return ns;
};

exports.clone = clone;

/**
 * 取唯一标识符
 *
 * @param {String} type 类型，可选s或c
 * @return {String}
 */
exports.uniqueId = function (type) {
  type = type.toLowerCase().substr(0, 1);
  var ret = [type, UID_PREFIX, exports.uniqueId.counter++].join('.');

  debug('generate uniqueId: %s', ret);
  return ret;
};

exports.uniqueId.counter = 0;

/**
 * 继承EventEmitter
 *
 * @param {Function} fn
 */
exports.inheritsEventEmitter = function (fn) {
  util.inherits(fn, events.EventEmitter);
};

/**
 * 继承CloudsBase
 *
 * @param {Function} fn
 */
exports.inheritsBase = function (fn) {
  util.inherits(fn, require('./base'));
};


function EventProxy () {
  this._status = {};
  this._list = [];
}

EventProxy.prototype.emit = function (e, d) {
  console.log('EventProxy: emit %s', e);
  this._status[e] = d;
  this._check();
};

EventProxy.prototype.all = function () {
  var args = Array.prototype.slice.call(arguments);
  var list = args.slice(0, -1);
  var callback = args[args.length - 1];
  this._list.push({list: list, callback: callback});
};

EventProxy.prototype._check = function () {
  var me = this;
  process.nextTick(function () {
    me._list.forEach(function (item, i) {
      var ok = true;
      var args = [];
      item.list.forEach(function (e) {
        ok = ok && (e in me._status);
        args.push(me._status[e]);
      });
      if (ok) {
        console.log('EventProxy: finish %s', item.list);
        me._list.splice(i, 1);
        item.callback.apply(null, args);
      }
    });
  });
};

exports.EventProxy = EventProxy;


// 唯一ID前缀
// 与当前主机名字相关，但考虑到主机名可能会很长，使用部分MD5值
var UID_PREFIX = utils.md5(os.hostname()).substr(0, 8) + '.x.' + process.pid;


var debug = exports.debug('utils');
