/**
 * clouds-controller tests
 *
 * @author 老雷<leizongmin@gmail.com>
 */

var should = require('should');
var async = require('async');
var KeyStatus = require('../../lib/keys');
var EventProxy = require('../../lib/utils').EventProxy;


describe('clouds-controller', function () {

  it('normal', function (done) {

    var s = new KeyStatus();

    s.set('a:a:1', 100);
    s.set('a:b:1', 100);
    s.set('a:c:1', 100);
    s.set('b:a:1', 100);
    s.set('c:a:1', 100);
    s.set('d:111s', 0);

    s.keys('*').should.eql(['a:a:1', 'a:b:1', 'a:c:1', 'b:a:1', 'c:a:1', 'd:111s']);
    s.keys('a:*').should.eql(['a:a:1', 'a:b:1', 'a:c:1']);
    s.keys('b:*').should.eql(['b:a:1']);
    s.keys('c:*').should.eql(['c:a:1']);
    s.keys('d:*').should.eql(['d:111s']);
    s.keys('e:*').should.eql([]);
    s.keys('*a*').should.eql(['a:a:1', 'a:b:1', 'a:c:1', 'b:a:1', 'c:a:1']);

    s.del('c:a:1');
    s.keys('c:*').should.eql([]);

    s.del('b');
    s.keys('b:*').should.eql(['b:a:1']);

    s.multi([['del', 'a:a:1'], ['del', 'a:b:1'], ['set', 'a:d:1', 0], ['keys', 'a:*']])
      .should.eql([1, 1, 0, ['a:c:1', 'a:d:1']]);

    s.destroy();
    done();

  });

  it('expired', function (done) {

    var s = new KeyStatus({interval: 200});

    s.set('a', 0);
    s.set('b', 1);
    s.set('c', 2);

    s.keys('*').should.eql(['a', 'b', 'c']);

    async.series([
      function (next) {
        setTimeout(next, 1200);
      },
      function (next) {
        s.keys('*').should.eql(['a', 'c']);
        next();
      },
      function (next) {
        setTimeout(next, 1200);
      },
      function (next) {
        s.keys('*').should.eql(['a']);
        next();
      }
    ], function (err) {
      should.equal(err, null);
      s.destroy();
      done();
    });

  });

});
