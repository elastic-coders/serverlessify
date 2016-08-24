'use strict';

const getObjectPath = require('./lib/utils').getObjectPath;
const executeLambdaCallback = require('./lib/lambda-callback').executeLambdaCallback;
const authorizerValidationCallback = require('./lib/authorizer-callback').authorizerValidationCallback;
const authorizerCheckCallback = require('./lib/authorizer-callback').authorizerCheckCallback;
const decorateLambdaReqCallback = require('./lib/decorators-callback').decorateLambdaReqCallback;
const decorateAddCORSCallback = require('./lib/decorators-callback').decorateAddCORSCallback;

module.exports = ({ html, authorizers }) => (slsConf, slsHandlers) => {
  for (let funcId in slsConf.functions) {
    const funcConf = slsConf.functions[funcId];
    let func = getObjectPath(funcConf.handler, slsHandlers);
    const events = (funcConf.events || []).map(e => e.http).filter(e => !!e);
    for (let e of events) {
      const authSource = getObjectPath(['authorizer', 'identitySource'], e);
      const authValidatorExp = getObjectPath(['authorizer', 'identityValidationExpression'], e);
      const authorizerFunction = (
        getObjectPath(getObjectPath(['authorizer', 'arn'], e) || '', authorizers) ||
        getObjectPath(getObjectPath(['authorizer', 'name'], e) || '', slsHandlers)
      );
      html(
        e.method.toLowerCase(),
        `/${e.path.replace(/\{(.+?)\}/g, ':$1')}`,
        [
          decorateLambdaReqCallback(),
          ...(authorizerFunction ? [
            authorizerValidationCallback(
              authSource,
              authValidatorExp ? new RegExp(authValidatorExp) : null,
              {
                regionId: 'express',
                accountId: 'serverlessify',
                apiId: `${slsConf.service}-${funcId}`,
              }
            ),
            authorizerCheckCallback(authorizerFunction)
          ] : []),
          ...(e.cors ? [decorateAddCORSCallback()] : []),
          executeLambdaCallback(func),
        ]
      )
    }
  }
};
