'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const subject = require('../lib/authorizer-callbacks');
require('chai').use(require('sinon-chai'));

describe('authorizer-callbacks', () => {
  it('should define callbacks', () => {
    expect(subject.authorizerValidationCallback).to.be.a('function');
    expect(subject.authorizerCheckCallback).to.be.a('function');
  });

  describe('authorizerValidationCallback', () => {
    let next;

    beforeEach(() => {
      next = sinon.spy();
    });

    it('should populate req.lambda.authorizer and call next', () => {
      const req = {
        method: 'get',
        path: '/test',
        headers: {
          auth: 'Bearer test',
        },
      };
      subject.authorizerValidationCallback()(req, null, next);
      expect(req.lambda).to.eql({
        authorizer: {
          event: {
            type: 'TOKEN',
            authorizationToken: 'Bearer test',
            methodArn: 'arn:serverlessify:execute-api:us-east-1:000001:app/GET/test'
          },
        },
      });
      expect(next).to.have.callCount(1);
    });

    it('should get a specified source', () => {
      const req = {
        method: 'get',
        path: '/test',
        headers: {
          authorization: 'test',
        },
      };
      subject.authorizerValidationCallback(
        'method.request.header.Authorization'
      )(req, null, next);
      expect(req.lambda.authorizer.event.authorizationToken).to.equal('test');
    });

    it('should send a 403 if no source is found', () => {
      const req = {
        method: 'get',
        path: '/test',
        headers: {
          auth: 'test',
        },
      };
      const res = {
        sendStatus: sinon.spy(),
      };
      const cb = subject.authorizerValidationCallback(
        'method.request.header.Authorization'
      );
      cb(req, res, next);
      expect(res.sendStatus).to.have.been.calledWith(403);
      expect(next).to.have.callCount(0);
    });

    it('should apply a validation regexp to the token', () => {
      const req = {
        method: 'get',
        path: '/test',
        headers: {
          auth: 'invalid',
        },
      };
      const res = {
        sendStatus: sinon.spy(),
      };
      subject.authorizerValidationCallback(
        null,
        /Bearer .*/
      )(req, res, next);
      expect(res.sendStatus).to.have.been.calledWith(403);
      expect(next).to.have.callCount(0);

      const req2 = {
        method: 'get',
        path: '/test',
        headers: {
          auth: 'Bearer allow',
        },
      };
      res.sendStatus.reset();
      next.reset();
      subject.authorizerValidationCallback(
        null,
        /Bearer .*/
      )(req2, res, next);
      expect(res.sendStatus).to.not.have.been.calledWith(403);
      expect(next).to.have.callCount(1);
    });

    it('should accept arn options', () => {
      const req = {
        method: 'get',
        path: '/test',
        headers: {
          auth: 'Bearer test',
        },
      };
      const opts = {
        regionId: 'test-region',
        accountId: 'test-account',
        apiId: 'test-app',
      };
      subject.authorizerValidationCallback(null, null, opts)(req, null, next);
      expect(req.lambda).to.eql({
        authorizer: {
          event: {
            type: 'TOKEN',
            authorizationToken: 'Bearer test',
            methodArn: 'arn:serverlessify:execute-api:test-region:test-account:test-app/GET/test'
          },
        },
      });
    });
  });

  describe('authorizerCheckCallback', () => {
    const req = {
      lambda: {
        authorizer: {
          event: {
            authorizationToken: 'test token',
          },
        },
        context: 'test context',
      },
    };
    const res = {
      send: sinon.spy(),
      sendStatus: sinon.spy(),
    };
    res.status = sinon.stub().returns(res);
    const next = sinon.spy();

    beforeEach(() => {
      next.reset();
      res.send.reset();
      res.status.reset();
      res.sendStatus.reset();
    });

    it('should skip if no authorizer is specified', () => {
      subject.authorizerCheckCallback()(null, null, next);
      expect(next).to.have.callCount(1);
    });

    it('should authorize if authorizer allow', () => {
      const doc = {
        policyDocument: {
          Statement: [{ Effect: 'Allow' }],
        },
      };
      const authorizer = sinon.spy((e, c, cb) => cb(null, doc));
      subject.authorizerCheckCallback(authorizer)(req, res, next);
      expect(authorizer).to.have.been.calledWithMatch(
        {
          authorizationToken: 'test token',
        },
        'test context'
      );
      expect(next).to.have.callCount(1);
    });

    it('should not authorize if authorizer deny', () => {
      const doc = {
        policyDocument: {
          Statement: [{ Effect: 'Deny' }],
        },
      };
      const authorizer = sinon.spy((e, c, cb) => cb(null, doc));
      subject.authorizerCheckCallback(authorizer)(req, res, next);
      expect(res.sendStatus).to.have.been.calledWith(401);
      expect(next).to.have.callCount(0);
    });

    it('should 500 if authorizer fails', () => {
      const authorizer = sinon.spy((e, c, cb) => cb('err'));
      subject.authorizerCheckCallback(authorizer)(req, res, next);
      expect(res.status).to.have.been.calledWith(500);
      expect(res.send).to.have.been.calledWith('err');
      expect(next).to.have.callCount(0);
    });

    it('should get authorization from cache', () => {
      const doc = {
        policyDocument: {
          Statement: [{ Effect: 'Allow' }],
        },
      };
      const authorizer = sinon.spy((e, c, cb) => cb(null, 'nope'));
      const getCache = sinon.spy((i, cb) => cb(null, doc));
      subject.authorizerCheckCallback(authorizer, null, getCache)(req, res, next);
      expect(getCache).to.have.callCount(1);
      expect(authorizer).to.have.callCount(0);
    });

    it('should save authorization to cache', () => {
      const doc = {
        policyDocument: {
          Statement: [{ Effect: 'Allow' }],
        },
      };
      const authorizer = sinon.spy((e, c, cb) => cb(null, doc));
      const setCache = sinon.spy((i, cb) => cb());
      subject.authorizerCheckCallback(authorizer, setCache)(req, res, next);
      expect(setCache).to.have.been.calledWithMatch(
        {
          key: 'test token',
          value: doc,
          ttl: 300,
        }
      );

      subject.authorizerCheckCallback(authorizer, setCache, null, 123)(req, res, next);
      expect(setCache).to.have.been.calledWithMatch(
        {
          key: 'test token',
          value: doc,
          ttl: 123,
        }
      );
    });
  });
});

