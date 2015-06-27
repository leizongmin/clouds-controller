/**
 * clouds-controller benchmark
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var clouds = require('clouds');
var controller = require('../');

function start (options1, options2) {

  options1 = options1 || {};
  options1.heartbeat = 4;

  options2 = options2 || {};
  options2.heartbeat = 4;

  var s1 = clouds.createServer(options1);
  var s2 = clouds.createServer(options2);

  s1.on('listen', function () {
    console.log('server1 listen');
    s1.register('math.add', function (a, b, callback) {
      callback(null, a + b);
    });
    s1.register('math.minus', function (a, b, callback) {
      callback(null, a - b);
    });
  });

  s2.on('listen', function () {
    console.log('server2 listen');
    s2.register('math.add', function (a, b, callback) {
      callback(null, a + b);
    });
    s2.register('math.minus', function (a, b, callback) {
      callback(null, a - b);
    });
  });

}

if (process.argv[2] === 'redis') {
  start();
} else {
  start({connection: controller.createConnection()}, {connection: controller.createConnection()});
}
