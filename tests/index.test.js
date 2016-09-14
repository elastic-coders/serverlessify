'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
require('chai').use(require('sinon-chai'));

describe('serverlessify', () => {
  const serverlessify = require('../index');

  it('should be a function', () => {
    expect(serverlessify).to.be.a('function');
  });

  it('should throw if no event handlers are specified', () => {
    expect(serverlessify).to.throw(/event handler to be specified/);
  });

  describe('http event handler', () => {
    let httpEventHandler;
    let sls;
    let req;
    let res;
    let next;
    let testConf;
    let testHandler;
    let testHandlers;

    beforeEach(() => {
      httpEventHandler = sinon.spy();
      sls = serverlessify({
        http: { eventHandler: httpEventHandler },
      });
      testConf = {
        service: 'test-service',
        functions: {
          'test-function': {
            handler: 'test-handler.test-function-handler',
            events: [
              {
                http: {
                  path: 'test-path',
                  method: 'GET',
                },
              },
            ],
          },
        },
      };
      testHandler = sinon.spy();
      testHandlers = {
        'test-handler': {
          'test-function-handler': testHandler,
        },
      };
      req = {
        method: 'test-req-method',
        headers: { 'test-req-header': 'test-req-header-value' },
        body: 'test-req-body',
        path: 'test-req-path',
        params: 'test-req-params',
        query: 'test-req-query',
      };
      next = sinon.spy();
    });

    it('should accept an http event handler', () => {
      expect(sls).to.be.a('function');
      expect(sls.getFunction).to.be.a('function');
    });

    it('should setup a simple GET endpoint', () => {
      sls(testConf, testHandlers);
      expect(httpEventHandler).to.have.been.calledWith(
        'get',
        '/test-path'
      );
      const callbacks = httpEventHandler.firstCall.args[2];
      expect(callbacks).to.be.an('array');
      expect(callbacks).to.have.lengthOf(2);
      const reqDecorateCb = callbacks[0];
      expect(reqDecorateCb).to.be.a('function');
      reqDecorateCb(req, res, next);
      expect(next).to.have.callCount(1);
      expect(req.lambda).to.eql({
        'context': {},
        'event': {
          'body': 'test-req-body',
          'headers': {
            'test-req-header': 'test-req-header-value',
          },
          'method': 'test-req-method',
          'path': 'test-req-params',
          'principalId': undefined,
          'query': 'test-req-query',
        },
      });
      const lambdaCb = callbacks[1];
      expect(lambdaCb).to.be.a('function');
      lambdaCb(req, res);
      expect(testHandler).to.have.been.calledWith(
        req.lambda.event,
        req.lambda.context
      );
    });

    it('should extract principalId using getPrincipalIdFromReq', () => {
      const getPrincipalIdFromReq = sinon.stub().returns('test-principal-id');
      sls = serverlessify({
        http: {
          eventHandler: httpEventHandler,
          getPrincipalIdFromReq
        },
      });
      sls(testConf, testHandlers);
      const callbacks = httpEventHandler.firstCall.args[2];
      const reqDecorateCb = callbacks[0];
      reqDecorateCb(req, res, next);
      expect(req.lambda.event.principalId).to.equal('test-principal-id');
    });

    it('should wrap a lambda with a wrapper function', () => {
      const wrappedLambda = sinon.spy();
      const wrapLambda = sinon.stub().returns(wrappedLambda);
      sls = serverlessify({
        http: {
          eventHandler: httpEventHandler,
          wrapLambda,
        },
      });
      sls(testConf, testHandlers);
      const callbacks = httpEventHandler.firstCall.args[2];
      const lambdaCb = callbacks[1];
      req.lambda = {
        event: 'test-req-event',
        context: 'test-req-context',
      };
      lambdaCb(req, res);
      expect(wrapLambda).to.have.been.calledWith(testHandler);
      expect(wrappedLambda).to.have.been.calledWith(
        req.lambda.event,
        req.lambda.context
      );
      expect(testHandler).to.have.callCount(0);
    });

    it('should add an authorization step with a local function', () => {
      testConf.functions['test-function'].events[0].http.authorizer = {
        name: 'test-authorizer',
      };
      const testAuthorizer = sinon.spy();
      testHandlers['test-handler']['test-authorizer'] = testAuthorizer;
      sls(testConf, testHandlers);
      const callbacks = httpEventHandler.firstCall.args[2];
      expect(callbacks).to.be.an('array');
      expect(callbacks).to.have.lengthOf(4);
    });

    it('should add an authorization step with a global authorizer', () => {
      testConf.functions['test-function'].events[0].http.authorizer = {
        arn: 'test-authorizer-arn',
      };
      const testAuthorizer = sinon.spy();
      sls = serverlessify({
        http: {
          eventHandler: httpEventHandler,
          authorizers: {
            'test-authorizer-arn': testAuthorizer,
          },
        },
      });
      sls(testConf, testHandlers);
      const callbacks = httpEventHandler.firstCall.args[2];
      expect(callbacks).to.be.an('array');
      expect(callbacks).to.have.lengthOf(4);
    });

    it('should expose added functions via getFunction', () => {
      sls(testConf, testHandlers);
      const f = sls.getFunction('test-handler', 'test-function');
      expect(f).to.exists;
    });
  });
});
