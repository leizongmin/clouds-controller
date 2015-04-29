/**
 * clouds-controller
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var Connection = require('./lib/connection');
var Server = require('./lib/server');


exports.version = require('./package.json').version;

exports.Connection = Connection;
exports.createConnection = function (options) {
  return new Connection(options);
};

exports.Server = Server;
exports.createServer = function (options) {
  return new Server(options);
};

