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
  });

  describe('authorizerCheckCallback', () => {

  });
});

