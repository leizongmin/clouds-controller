/**
 * clouds-controller tests
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var should = require('should');
var async = require('async');
var controller = require('../');
var EventProxy = require('../lib/utils').EventProxy;


describe('clouds-controller', function () {

  it('message', function (done) {

    var s = controller.createServer();
    s.listen();

    var ep = new EventProxy();

    s.on('listening', function () {
      var c1 = controller.createConnection();
      c1.on('ready', function () {
        ep.emit('c1', c1);
      });
      var c2 = controller.createConnection();
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

});
