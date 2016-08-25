'use strict';

const getObjectPath = require('./lib/utils').getObjectPath;
const executeLambdaCallback = require('./lib/lambda-callbacks').executeLambdaCallback;
const authorizerValidationCallback = require('./lib/authorizer-callbacks').authorizerValidationCallback;
const authorizerCheckCallback = require('./lib/authorizer-callbacks').authorizerCheckCallback;
const decorateLambdaReqCallback = require('./lib/decorators-callbacks').decorateLambdaReqCallback;
const decorateAddCORSCallback = require('./lib/decorators-callbacks').decorateAddCORSCallback;

// Options:
// - `html`
// - `authorizers`
// - `setCacheEntry`
// - `getCacheEntry`
module.exports = function(options) {
  return function(slsConf, slsHandlers) {
    for (let funcId in slsConf.functions) {
      const funcConf = slsConf.functions[funcId];
      let func = getObjectPath(funcConf.handler, slsHandlers);
      const events = (funcConf.events || []).map(e => e.http).filter(e => !!e);
      for (let e of events) {
        const authSource = getObjectPath(['authorizer', 'identitySource'], e);
        const authValidatorExp = getObjectPath(['authorizer', 'identityValidationExpression'], e);
        const authCacheTtl = getObjectPath(['authorizer', 'resultTtlInSeconds'], e);
        const authorizerFunction = (
          getObjectPath(getObjectPath(['authorizer', 'arn'], e) || '', options.authorizers) ||
          getObjectPath(getObjectPath(['authorizer', 'name'], e) || '', slsHandlers)
        );
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
        if (e.cors) {
          callbacks.push(decorateAddCORSCallback());
        }
        callbacks.push(executeLambdaCallback(func));
        options.html(
          e.method.toLowerCase(),
          `/${e.path.replace(/\{(.+?)\}/g, ':$1')}`,
          callbacks
        );
      }
    }
  };
};
