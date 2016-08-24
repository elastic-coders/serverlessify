'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const subject = require('../lib/lambda-callbacks');
require('chai').use(require('sinon-chai'));

describe('lambda-callbacks', () => {
  it('should define callbacks', () => {
    expect(subject.executeLambdaCallback).to.be.a('function');
  });

  describe('executeLambdaCallback', () => {
    const req = {
      lambda: {
        event: 'test event',
        context: 'test context',
      },
    };
    const res = {
      send: sinon.spy(),
    };
    const next = sinon.spy();

    beforeEach(() => {
      res.status = sinon.stub().returns(res);
      res.send.reset();
      next.reset();
    });

    it('should send a 200 if handler succeed', () => {
      const handler = sinon.spy((e, c, cb) => cb(null, 'resp'));
      subject.executeLambdaCallback(handler)(req, res, next);
      expect(handler).to.have.been.calledWith('test event', 'test context');
      expect(res.status).to.have.been.calledWith(200);
      expect(res.send).to.have.been.calledWith('resp');
      expect(next).to.have.callCount(0);
    });

    it('should send a 500 if handler fails', () => {
      const handler = sinon.spy((e, c, cb) => cb('err'));
      subject.executeLambdaCallback(handler)(req, res, next);
      expect(handler).to.have.been.calledWith('test event', 'test context');
      expect(res.status).to.have.been.calledWith(500);
      expect(res.send).to.have.been.calledWith('err');
      expect(next).to.have.callCount(0);
    });
  });
});
