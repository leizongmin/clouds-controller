var clouds = require('clouds');
var should = require('should');
var async = require('async');
var connection = require('../connection');

describe('timeout', function () {

  function checkMessagesClean (c) {
    Object.keys(c._messages).length.should.equal(0);
  }

  it('test3 - normal call', function (done) {
    var s = clouds.createServer({connection: connection.create()});
    var c = clouds.createClient({timeout: 1, connection: connection.create()});
    async.series([
      function (next) {
        s.register('test3.timeout.1', function (callback) {
          setTimeout(callback, 1500);
        }, next);
      },
      function (next) {
        c.call('test3.timeout.1', [], function (err, ret) {
          should.notEqual(err, null);
          err.code.should.equal('CLOUDS_CALL_SERVICE_TIMEOUT');
          next();
        });
      },
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      checkMessagesClean(c);
      s.exit();
      c.exit();
      done();
    });
  });

  it('test3 - normal bind', function (done) {
    var s = clouds.createServer({connection: connection.create()});
    var c = clouds.createClient({timeout: 1, connection: connection.create()});

    var timeout2 = c.bind('test3.timeout.2');

    async.series([
      function (next) {
        s.register('test3.timeout.2', function (callback) {
          setTimeout(callback, 1500);
        }, next);
      },
      function (next) {
        timeout2(function (err, ret) {
          should.notEqual(err, null);
          err.code.should.equal('CLOUDS_CALL_SERVICE_TIMEOUT');
          next();
        });
      },
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      checkMessagesClean(c);
      s.exit();
      c.exit();
      done();
    });
  });

  it('test3 - retry', function (done) {
    var s = clouds.createServer({connection: connection.create()});
    var c = clouds.createClient({
      timeout: 1,
      notAutoCleanRemoteServer: true,
      connection: connection.create()
    });

    var timeout3 = c.bind('test3.timeout.3', 3);
    var counter = 0;

    async.series([
      function (next) {
        s.register('test3.timeout.3', function (callback) {
          counter++;
          setTimeout(callback, 1500);
        }, next);
      },
      function (next) {
        timeout3(function (err, ret) {
          console.log(arguments);
          should.notEqual(err, null);
          err.code.should.equal('CLOUDS_CALL_SERVICE_TIMEOUT');
          counter.should.equal(4);
          next();
        });
      },
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      checkMessagesClean(c);
      s.exit();
      c.exit();
      done();
    });
  });

  it('test3 - retry & assigned onRetry', function (done) {
    var s = clouds.createServer({connection: connection.create()});
    var c = clouds.createClient({
      timeout: 1,
      notAutoCleanRemoteServer: true,
      connection: connection.create()
    });

    var timeout4 = c.bind('test3.timeout.4', 1, function (v, callback) {
      v.should.equal(arg1);
      counter1++;
      callback(v + 1);
    });
    var counter1 = 0;
    var counter2 = 0;
    var arg1 = parseInt(Math.random() * 10, 10);

    async.series([
      function (next) {
        s.register('test3.timeout.4', function (v, callback) {
          v.should.equal(arg1 + 1);
          counter2++;
          setTimeout(callback, 1500);
        }, next);
      },
      function (next) {
        timeout4(arg1, function (err, ret) {
          should.notEqual(err, null);
          err.code.should.equal('CLOUDS_CALL_SERVICE_TIMEOUT');
          counter1.should.equal(2);
          counter2.should.equal(2);
          next();
        });
      },
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      checkMessagesClean(c);
      s.exit();
      c.exit();
      done();
    });
  });

  it('test3 - retry & assigned onRetry', function (done) {
    var s = clouds.createServer({connection: connection.create()});
    var c = clouds.createClient({
      timeout: 1,
      connection: connection.create()
    });

    var timeout5 = c.bind('test3.timeout.5', 1, function (v, callback) {
      v.should.equal(arg1);
      counter1++;
      callback(v + 1);
    });
    var counter1 = 0;
    var counter2 = 0;
    var arg1 = parseInt(Math.random() * 10, 10);

    async.series([
      function (next) {
        s.register('test3.timeout.5', function (v, callback) {
          v.should.equal(arg1 + 1);
          counter2++;
          setTimeout(callback, 1500);
        }, next);
      },
      function (next) {
        timeout5(arg1, function (err, ret) {
          should.notEqual(err, null);
          err.code.should.equal('CLOUDS_NO_AVAILABLE_SERVER');
          counter1.should.equal(2);
          counter2.should.equal(1);
          next();
        });
      },
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      checkMessagesClean(c);
      s.exit();
      c.exit();
      done();
    });
  });

  it('test3 - auto clear server', function (done) {
    var s = clouds.createServer({connection: connection.create()});
    var c = clouds.createClient({
      timeout: 1,
      serverMaxAge: 1,
      connection: connection.create()
    });

    var timeout6 = c.bind('test3.timeout.6', 100);
    var counter = 0;

    async.series([
      function (next) {
        s.register('test3.timeout.6', function (v, callback) {
          counter++;
          if (counter % 2 === 0) {
            callback(null, v + 1);
          } else {
            setTimeout(function () {
              callback(null, v + 1);
            }, 1500);
          }
        }, next);
      },
      function (next) {
        timeout6(123, function (err, ret) {
          should.equal(err, null);
          console.log(counter);
          next();
        });
      },
    ], function (err) {
      console.log(err && err.stack);
      should.equal(err, null);
      counter.should.greaterThan(1);
      checkMessagesClean(c);
      s.exit();
      c.exit();
      done();
    });
  });

});
