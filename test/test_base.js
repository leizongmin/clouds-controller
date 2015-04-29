/**
 * clouds-controller tests
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var should = require('should');
var async = require('async');
var controller = require('../');

describe('clouds-controller', function () {

  it('connect', function (done) {

    var s = controller.createServer();
    s.listen();
    s.on('listening', function () {
      var c = controller.createConnection();
      c.on('ready', function () {
        c.send(c.id, 'hello, world');
      });
    });

  });

});
