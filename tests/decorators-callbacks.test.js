'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const subject = require('../lib/decorators-callbacks');
require('chai').use(require('sinon-chai'));

describe('utils', () => {
  it('should define decorator callbacks', () => {
    expect(subject.decorateLambdaReqCallback).to.be.a('function');
    expect(subject.decorateAddCORSCallback).to.be.a('function');
  });

  describe('decorateLambdaReqCallback', () => {
    it('should return an handler function', () => {
      expect(subject.decorateLambdaReqCallback()).to.be.a('function');
    });

    it('should append lambda event and context to the request', () => {
      const cb = subject.decorateLambdaReqCallback();
      const req = {
        method: 'test-method',
        headers: 'test-headers',
        body: 'test-body',
        params: 'test-params',
        query: 'test-query',
      };
      const res = {};
      const next = sinon.spy();
      cb(req, res, next);
      expect(req.lambda).to.eql({
        event: {
          method: 'test-method',
          headers: 'test-headers',
          body: 'test-body',
          path: 'test-params',
          query: 'test-query',
          principalId: undefined,
        },
        context: {},
      });
      expect(next).to.have.callCount(1);
    });

    it('should get principalId from function', () => {
      const getPrincipalId = sinon.stub().returns('test-principalId');
      const cb = subject.decorateLambdaReqCallback(getPrincipalId);
      const req = { test: 'req' };
      const res = {};
      const next = sinon.spy();
      cb(req, res, next);
      expect(getPrincipalId).to.have.been.calledWith(req);
      expect(req.lambda.event.principalId).to.equal('test-principalId');
    });
  });

  describe('decorateAddCORSCallback', () => {
    it('should return an handler function', () => {
      expect(subject.decorateAddCORSCallback()).to.be.a('function');
    });

    it('should add CORS headers', () => {
      const cb = subject.decorateAddCORSCallback();
      const req = {};
      const res = {
        header: sinon.spy(),
      };
      const next = sinon.spy();
      cb(req, res, next);
      expect(res.header).to.have.been.calledWith('Access-Control-Allow-Origin', '*');
      expect(res.header).to.have.been.calledWith('Access-Control-Allow-Methods', 'GET,PUT,HEAD,PATCH,POST,DELETE,OPTIONS');
      expect(res.header).to.have.been.calledWith('Access-Control-Allow-Headers', 'Authorization,Content-Type,x-amz-date,x-amz-security-token');
      expect(next).to.have.callCount(1);
    });
  });
});
