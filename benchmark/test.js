/**
 * clouds-controller benchmark
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var assert = require('assert');
var clouds = require('clouds');
var async = require('async');
var controller = require('../');


var TIMES = 1000;
var PARTS = 50;

function start (options) {

  options = options || {};
  options.timeout = 2;
  var c = clouds.createClient(options);

  c.on('listen', function () {
    console.log('listen');
    var add = c.bind('math.add');
    var minus = c.bind('math.minus');

    var results = [];

    function part (callback) {
      var t = Date.now();
      async.times(TIMES, function (i, next) {
        add(i, i, function (err, r) {
          if (!err) {
            assert.equal(r, i + i);
          }
          next(err);
        });
      }, function (err) {
        if (err) throw err;
        var s = Date.now() - t;
        results.push(s);
        console.log('call %s times, spent %sms', TIMES, s);
        callback();
      });
    }

    async.timesSeries(PARTS, function (i, next) {
      part(next);
    }, function (err) {
      if (err) throw err;
      c.exit();

      results.sort();
      results.shift();
      results.pop();
      var r = results.reduce(function (a, b) {
        return a + b;
      });
      r = r / results.length;
      console.log('call %s times, average %sms', TIMES, parseInt(r, 10));

      process.exit();
    });

  });

}

if (process.argv[2] === 'redis') {
  start();
} else {
  start({
    connection: controller.createConnection()
  });
}
