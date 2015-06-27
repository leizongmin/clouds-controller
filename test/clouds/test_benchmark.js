var clouds = require('clouds');
var should = require('should');
var async = require('async');
var connection = require('../connection');

describe('benchmark', function () {

  function checkMessagesClean (c) {
    Object.keys(c._messages).length.should.equal(0);
  }

  it('test7 - 10000 calls', function (done) {
    var s1 = clouds.createServer({connection: connection.create()});
    var s2 = clouds.createServer({connection: connection.create()});
    var s3 = clouds.createServer({connection: connection.create()});
    var c = clouds.createClient({timeout: 20, connection: connection.create()});

    var MAX = 10000;
    var counter = {a: 0, b: 0, c: 0};
    var multi1 = c.bind('test7.multi.1', 1);

    async.series([
      function (next) {
        s1.register('test7.multi.1', function (v, callback) {
          callback(null, 'a');
        }, next);
      },
      function (next) {
        s2.register('test7.multi.1', function (v, callback) {
          callback(null, 'b');
        }, next);
      },
      function (next) {
        s3.register('test7.multi.1', function (v, callback) {
          callback(null, 'c');
        }, next);
      },
      function (next) {
        async.timesSeries(MAX, function (i, next) {
          multi1(i, function (err, n) {
            should.equal(err, null);
            counter[n]++;
            next();
          });
        }, next);
      }
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      (counter.a + counter.b + counter.c).should.equal(MAX);
      console.log(counter);
      s1.exit();
      s2.exit();
      s3.exit();
      c.exit();
      done();
    });
  });

});
