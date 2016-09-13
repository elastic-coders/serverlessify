'use strict';

const getObjectPath = require('./lib/utils').getObjectPath;
const executeLambdaCallback = require('./lib/lambda-callbacks').executeLambdaCallback;
const authorizerValidationCallback = require('./lib/authorizer-callbacks').authorizerValidationCallback;
const authorizerCheckCallback = require('./lib/authorizer-callbacks').authorizerCheckCallback;
const decorateLambdaReqCallback = require('./lib/decorators-callbacks').decorateLambdaReqCallback;
const decorateAddCORSCallback = require('./lib/decorators-callbacks').decorateAddCORSCallback;

const send200 = (req, res) => res.sendStatus(200);

// Options:
// - `html`
// - `authorizers`
// - `setCacheEntry({key, value, ttl}, cb())`
// - `getCacheEntry(key, cb(err, value))`
// - `wrapLambda`
module.exports = function(options) {
  const services = {};
  const sls = function(slsConf, slsHandlers) {
    const service = services[slsConf.service] = services[slsConf.service] || {};
    for (let funcId in slsConf.functions) {
      const funcConf = slsConf.functions[funcId];
      let func = getObjectPath(funcConf.handler, slsHandlers);
      if (options.wrapLambda) {
        func = options.wrapLambda(func);
      }
      service[funcId] = func;
      // http
      const events = (funcConf.events || []).map(e => e.http).filter(e => !!e);
      for (let e of events) {
        // Prepare endpoint options
        const method = e.method.toLowerCase();
        const path = `/${e.path.replace(/\{(.+?)\}/g, ':$1')}`;
        // Prepare authorization options
        const authSource = getObjectPath(['authorizer', 'identitySource'], e);
        const authValidatorExp = getObjectPath(['authorizer', 'identityValidationExpression'], e);
        const authCacheTtl = getObjectPath(['authorizer', 'resultTtlInSeconds'], e);
        const authorizerFunction = (
          getObjectPath(getObjectPath(['authorizer', 'arn'], e) || '', options.authorizers) ||
          getObjectPath(getObjectPath(['authorizer', 'name'], e) || '', slsHandlers)
        );
        // Prepare callback
        const callbacks = [decorateLambdaReqCallback()];
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
            options.setCacheEntry,
            options.getCacheEntry,
            authCacheTtl
          ));
        }
        callbacks.push(executeLambdaCallback(func));
        // Setup endpoint
        if (e.cors) {
          options.html('options', path, [decorateAddCORSCallback(), send200]);
        }
        options.html(method, path, callbacks);
      }
    }
  };
  sls.getFunction = (service, func) => (services[service] || {})[func];
  return sls;
};
