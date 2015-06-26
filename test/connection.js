var controller = require('../');

var HOST = '127.0.0.1';
var PORT = 6482;

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
