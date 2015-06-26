var controller = require('../');
var utils = require('./utils');

var HOST = '127.0.0.1';
var PORT = utils.genPort();

var server = controller.createServer();
server.listen(PORT, HOST);

function createConnection () {
  return controller.createConnection({
    port: PORT,
    host: HOST
  });
}

exports.server = server;
exports.create = createConnection;
