'use strict';

const getObjectPath = require('./lib/utils').getObjectPath;
const executeLambdaCallback = require('./lib/lambda-callbacks').executeLambdaCallback;
const authorizerValidationCallback = require('./lib/authorizer-callbacks').authorizerValidationCallback;
const authorizerCheckCallback = require('./lib/authorizer-callbacks').authorizerCheckCallback;
const decorateLambdaReqCallback = require('./lib/decorators-callbacks').decorateLambdaReqCallback;
const decorateAddCORSCallback = require('./lib/decorators-callbacks').decorateAddCORSCallback;

const send200 = (req, res) => res.sendStatus(200);

// # Serverlessify
// Uses the provided event handlers to simulate the workings of
// AWS lambda infrastructure on a local server.
//
// Options are:
// - `http`: (required) an map with http event handler configuration:
//   - `eventHandler`: (required) An Express app instance that will be configured
//     to work like AWS API Gateway for the Serverless funcitons that has an http
//     event source.
//   - `getPrincipalIdFromReq`: a function that should return a string sent to the
//     lambda handler as `principalId`. The function will recive the http `req` parameter.
//   - `wrapLambda`: a function that will be called with a lambda function as parameter.
//     A new function should be returned with should in turn call the given lamnda.
//     This is useful if common logic like error handling or promise lambdas
//     should be added to all http handle lambdas.
//   - `authorizers`: a map of global authorizers that will be available to
//     Serverless http event authorizer configuration as `arn`s
//   - `authorizersCacheSet` a `function({key, value, ttl}, cb)` used to set an entry
//     in a custom cache to save calls to the authorizer. ttl defaults to 300 (ms)
//     and should be used to invalidate the cache if a `authorizersCacheGet` is
//     received after that time. The callback `cb` should be called after the cache
//     has been set.
//   - `authorizersCacheGet` a `function(key, cb)` used to retireve a cached item.
//     This function should call the callback with a falsy value if there is
//     no cache for the given key or if the cache item is expired. The callback is
//     a `function(error, value)`.
module.exports = function(options) {
  // Validate options
  const httpConfig = options && options.http;
  if (!httpConfig || !httpConfig.eventHandler) {
    throw new Error('Serverlessify requires at least one event handler to be specified');
  }
  // Prepare Serverlessify instance
  const services = {};
  const sls = function(slsConf, slsHandlers) {
    const service = services[slsConf.service] = services[slsConf.service] || {};
    for (let funcId in slsConf.functions) {
      const funcConf = slsConf.functions[funcId];
      let func = getObjectPath(funcConf.handler, slsHandlers);
      if (httpConfig.wrapLambda) {
        func = httpConfig.wrapLambda(func);
      }
      service[funcId] = func;
      // http event source setup
      const events = (funcConf.events || []).map(e => e.http).filter(e => !!e);
      for (let e of events) {
        // Prepare endpoint options
        const method = e.method.toLowerCase();
        const path = `/${e.path.replace(/\{(.+?)\}/g, ':$1')}`;
        // Prepare authorization options
        const authSource = getObjectPath(['authorizer', 'identitySource'], e);
        const authValidatorExp = getObjectPath(['authorizer', 'identityValidationExpression'], e);
        const authCacheTtl = getObjectPath(['authorizer', 'resultTtlInSeconds'], e);
        const authorizerArn = getObjectPath(['authorizer', 'arn'], e);
        const authorizerName = getObjectPath(['authorizer', 'name'], e);
        const authorizerFunction = (
          (authorizerArn && getObjectPath(authorizerArn, httpConfig.authorizers)) ||
          (authorizerName && getObjectPath(authorizerName, slsHandlers)) ||
          (authorizerName && getObjectPath(`${funcConf.handler.split('.')[0]}.${authorizerName}`, slsHandlers))
        );
        // Prepare callback
        const callbacks = [
          decorateLambdaReqCallback(httpConfig.getPrincipalIdFromReq)
        ];
        if (authorizerFunction) {
          callbacks.push(authorizerValidationCallback(
            authSource,
            authValidatorExp ? new RegExp(authValidatorExp) : null,
            {
              regionId: 'express',
              accountId: 'serverlessify',
              apiId: `${slsConf.service}-${funcId}`,
            }
          ));
          callbacks.push(authorizerCheckCallback(
            authorizerFunction,
            httpConfig.authorizersCacheSet,
            httpConfig.authorizersCacheGet,
            authCacheTtl
          ));
        }
        callbacks.push(executeLambdaCallback(func));
        // Setup endpoint
        if (e.cors) {
          httpConfig.eventHandler('options', path, [decorateAddCORSCallback(e.cors), send200]);
          callbacks.unshift(decorateAddCORSCallback(e.cors));
        }
        httpConfig.eventHandler(method, path, callbacks);
      }
    }
  };
  sls.getFunction = (service, func) => (services[service] || {})[func];
  return sls;
};
