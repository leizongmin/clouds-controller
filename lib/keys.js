/**
 * clouds-controller KeyStatus
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var define = require('./define');
var utils = require('./utils');


// 支持的基本命令
var METHODS = {
  set: true,
  del: true,
  keys: true
};

/**
 * KeyStatus
 *
 * @param {Object} options
 */
function KeyStatus (options) {
  options = utils.clone(options || {});
  var id = this.id = options.id || utils.uniqueId('keys');
  var debug = this._debug = utils.debug('keys:' + id);
  this._keys = {};
  var me = this;

  options.interval = options.interval || define.keysStatusScanInterval;
  me._tid = setInterval(function () {
    me._debug('scan expired keys');
    var now = Date.now();
    for (var k in me._keys) {
      var v = me._keys[k];
      if (v > 0 && v < now) {
        me._debug('key expired: %s, %s', k, v);
        delete me._keys[k];
      }
    }
  }, options.interval);
}

/**
 * set
 *
 * @param {String} k
 * @param {Number} ttl
 * @return {Number}
 */
KeyStatus.prototype.set = function (k, ttl) {
  var expired = (ttl > 0 ? Date.now() + ttl * 1000 : -1);
  this._debug('set: %s [ttl=%s, expired=%s]', k, ttl, expired);
  this._keys[k] = expired;
  return ttl;
};

/**
 * del
 *
 * @param {String} k
 * @return {Number}
 */
KeyStatus.prototype.del = function (k) {
  var v = this._keys[k];
  delete this._keys[k];
  this._debug('del: %s [exists=%s]', k, !!v);
  return 1;
};

/**
 * keys
 *
 * @param {String} k
 * @return {Array}
 */
KeyStatus.prototype.keys = function (k) {
  this._debug('keys: %s', k);
  var reg = new RegExp('^' + k.replace(/\*/g, '.*') + '$', 'g');
  return Object.keys(this._keys).filter(function (k) {
    reg.lastIndex = 0;
    return reg.test(k);
  });
};

/**
 * multi
 *
 * @param {Array} list
 * @return {Array}
 */
KeyStatus.prototype.multi = function (list) {
  this._debug('multi: %s', list);
  var me = this;
  return list.map(function (item) {
    var op = item[0];
    var a = item[1];
    var b = item[2];
    if (op in METHODS) {
      return me[op](a, b);
    } else {
      me._debug('unsupported method: %s, %s, %s', op, a, b);
      return 0;
    }
  });
};

KeyStatus.prototype.delKeys = function (keys) {
  var me = this;
  return keys.map(function (k) {
    return me.del(k);
  });
};

/**
 * destroy
 */
KeyStatus.prototype.destroy = function () {
  this._debug('destroy');
  clearInterval(this._tid);
  this._keys = null;
};


module.exports = KeyStatus;
