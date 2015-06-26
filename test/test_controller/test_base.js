/**
 * clouds-controller tests
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var should = require('should');
var async = require('async');
var controller = require('../../');
var EventProxy = require('../../lib/utils').EventProxy;


describe('clouds-controller', function () {

  it('send message to other client', function (done) {

    var PORT = 6480;
    var s = controller.createServer();
    s.listen(PORT);

    var ep = new EventProxy();

    s.on('listening', function () {
      var c1 = controller.createConnection({controller: {port: PORT}});
      c1.on('ready', function () {
        ep.emit('c1', c1);
      });
      var c2 = controller.createConnection({controller: {port: PORT}});
      c2.on('ready', function () {
        ep.emit('c2', c2);
      });
    });

    ep.all('c1', 'c2', function (c1, c2) {
      console.log('sending...');
      var d1 = Math.random().toString();
      var d2 = Math.random().toString();
      c1.on('message', function (data) {
        data.should.equal(d2);
        ep.emit('d2');
      });
      c2.on('message', function (data) {
        data.should.equal(d1);
        ep.emit('d1');
      });
      c1.send(c2.id, d1, function (err) {
        should.equal(err, null);
      });
      c2.send(c1.id, d2, function (err) {
        should.equal(err, null);
      });

      ep.all('d1', 'd2', function () {
        console.log('exit...');
        c1.exit(function () {
          ep.emit('e1', c1);
        });
        c2.exit(function () {
          ep.emit('e2', c2);
        });
        ep.all('e1', 'e2', function () {
          console.log('done');
          done();
        });
      });
    });

  });

  it('send message to other client (multi)', function (done) {

    var PORT = 6481;
    var s = controller.createServer();
    s.listen(PORT);

    var ep = new EventProxy();

    s.on('listening', function () {
      var c1 = controller.createConnection({controller: {port: PORT}});
      c1.on('ready', function () {
        ep.emit('c1', c1);
      });
      var c2 = controller.createConnection({controller: {port: PORT}});
      c2.on('ready', function () {
        ep.emit('c2', c2);
      });
    });

    ep.all('c1', 'c2', function (c1, c2) {
      console.log('sending...');
      var dataList = [];
      for (var i = 0; i < 100; i++) {
        dataList.push('D' + i + '_' + Math.random());
      }
      var dataMap = {};
      dataList.forEach(function (d) {
        dataMap[d] = false;
      });

      c2.on('message', function (d) {
        should.equal(d in dataMap, true);
        dataMap[d] = true;
        ep.emit(d);
      });

      ep.all.apply(ep, dataList.concat([function () {
        console.log('exit...');
        c1.exit(function () {
          ep.emit('e1', c1);
        });
        c2.exit(function () {
          ep.emit('e2', c2);
        });
        ep.all('e1', 'e2', function () {
          console.log('done');
          done();
        });
      }]));

      dataList.forEach(function (d) {
        c1.send(c2.id, d, function (err) {
          should.equal(err, null);
        });
      });
    });

  });

  it('exec command', function (done) {

    var PORT = 6482;
    var s = controller.createServer();
    s.listen(PORT);

    var ep = new EventProxy();

    s.on('listening', function () {
      var c1 = controller.createConnection({controller: {port: PORT}});
      c1.on('ready', function () {
        ep.emit('c1', c1);
      });
      var c2 = controller.createConnection({controller: {port: PORT}});
      c2.on('ready', function () {
        ep.emit('c2', c2);
      });
    });

    ep.all('c1', 'c2', function (c1, c2) {
      async.series([
        function (next) {
          c1.registerKey('aaaa', 0, next);
        },
        function (next) {
          c1.registerKey('bbbb', 2, next);
        },
        function (next) {
          c1.keys('*', function (err, ret) {
            ret.should.eql(['aaaa', 'bbbb']);
            next(err);
          });
        },
        function (next) {
          c2.keys('*', function (err, ret) {
            ret.should.eql(['aaaa', 'bbbb']);
            next(err);
          });
        },
        function (next) {
          c1.deleteKey('aaaa', next);
        },
        function (next) {
          c2.keys('*', function (err, ret) {
            ret.should.eql(['bbbb']);
            next(err);
          });
        },
        function (next) {
          setTimeout(next, 3000);
        },
        function (next) {
          c2.keys('*', function (err, ret) {
            ret.should.eql([]);
            next(err);
          });
        },
        function (next) {
          c2.registerKey('a', 0, next);
        },
        function (next) {
          c2.registerKey('b', 0, next);
        },
        function (next) {
          c2.registerKey('c', 0, next);
        },
        function (next) {
          c2.keys('*', function (err, ret) {
            ret.should.eql(['a', 'b', 'c']);
            next(err);
          });
        },
        function (next) {
          c2.deleteKeys(['a', 'b'], next);
        },
        function (next) {
          c2.keys('*', function (err, ret) {
            ret.should.eql(['c']);
            next(err);
          });
        }
      ], function (err) {
        should.equal(err, null);
        console.log('done');
        done();
      });
    });

  });

});
