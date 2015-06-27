/**
 * clouds-controller tests
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var should = require('should');
var async = require('async');
var controller = require('../../');
var EventProxy = require('../../lib/utils').EventProxy;
var utils = require('../utils');


describe('clouds-controller', function () {

  it('send message to other client', function (done) {

    var PORT = utils.genPort();
    var s = controller.createServer();
    s.listen(PORT);

    var ep = new EventProxy();

    s.on('listening', function () {
      var c1 = controller.createConnection({port: PORT});
      var c2 = controller.createConnection({port: PORT});
      ready(c1, c2);
    });

    function ready (c1, c2) {
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
    }

  });

  it('send message to other client (multi)', function (done) {

    var PORT = utils.genPort();
    var s = controller.createServer();
    s.listen(PORT);

    var ep = new EventProxy();

    s.on('listening', function () {
      var c1 = controller.createConnection({port: PORT});
      var c2 = controller.createConnection({port: PORT});
      ready(c1, c2);
    });

    function ready (c1, c2) {
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
    }

  });

});
