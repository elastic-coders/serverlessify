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
    const testConf = {
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
    const testHandler = sinon.spy();
    const testHandlers = {
      'test-handler': {
        'test-function-handler': testHandler,
      },
    };

    beforeEach(() => {
      httpEventHandler = sinon.spy();
      sls = serverlessify({
        http: { eventHandler: httpEventHandler },
      });
      testHandler.reset();
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
  });
});
