'use strict';

const getObjectPath = require('./utils').getObjectPath;

// arnOptions:
// - `regionId`
// - `accountId`
// - `apiId`
module.exports.authorizerValidationCallback = function(
  identitySource,
  identityValidationRegExp,
  arnOptions
) {
  const regionId = arnOptions && arnOptions.regionId || 'us-east-1';
  const accountId = arnOptions && arnOptions.accountId || '000001';
  const apiId = arnOptions && arnOptions.apiId || 'app';
  const stageId = arnOptions && arnOptions.stageId || 'dev';
  return function(req, res, next) {
    const sources = {
      method: {
        request: {
          header: req.headers,
        },
      },
    };
    const source = getObjectPath(
      (identitySource || 'method.request.header.Authorization').toLowerCase(),
      sources
    );
    if (!source || (identityValidationRegExp && identityValidationRegExp.exec(source) === null)) {
      res.sendStatus(403);
      return;
    }
    const method = req.method.toUpperCase();
    const resourcePath = req.path;
    req.lambda = (req.lambda || {});
    req.lambda.authorizer = {
      event: {
        type: 'TOKEN',
        authorizationToken: source,
        methodArn: `arn:aws:execute-api:${regionId}:${accountId}:${apiId}/${stageId}/${method}${resourcePath}`,
      },
    };
    next();
  };
};

// event format
// {
//     "type":"TOKEN",
//     "authorizationToken":"<caller-supplied-token>",
//     "methodArn":"arn:aws:execute-api:<regionId>:<accountId>:<apiId>/<stage>/<method>/<resourcePath>"
// }
// awsAuthDocument format
// {
//   // The principal user identification associated with the token send by the client.
//   "principalId": "xxxxxxxx",
//   "policyDocument": {
//     "Version": "2012-10-17",
//     "Statement": [
//       {
//         "Action": "execute-api:Invoke",
//         "Effect": "Allow|Deny",
//         "Resource": "arn:aws:execute-api:<regionId>:<accountId>:<appId>/<stage>/<httpVerb>/[<resource>/<httpVerb>/[...]]"
//       }
//     ]
//   }
// }
module.exports.authorizerCheckCallback = function(
  authorizer,
  setCacheEntry,
  getCacheEntry,
  cacheEntryTtl
) {
  const defaultCacheFunc = function(i, cb) { cb() };
  return function(req, res, next) {
    if (!authorizer) {
      return next();
    }

    function authorizerCallback(err, awsAuthDocument) {
      if (err) {
        res.status(500).send(err.toString());
      } else {
        // TODO consider other statement values
        const effect = getObjectPath(
          ['policyDocument', 'Statement', 0, 'Effect'],
          awsAuthDocument
        );
        if (effect === 'Allow') {
          next();
        } else {
          res.sendStatus(401);
        }
      }
    }

    const cacheKey = (
      req.lambda.authorizer.event.authorizationToken +
      '@' +
      req.lambda.authorizer.event.methodArn
    );
    (getCacheEntry || defaultCacheFunc)(
      cacheKey,
      function(err, cachedAuthorization) {
        if (cachedAuthorization) {
          authorizerCallback(err, cachedAuthorization);
        } else {
          authorizer(
            req.lambda.authorizer.event,
            req.lambda.context,
            function(innerErr, awsAuthDocument) {
              (setCacheEntry || defaultCacheFunc)({
                key: cacheKey,
                value: awsAuthDocument,
                ttl: cacheEntryTtl || 300,
              }, function() {
                authorizerCallback(innerErr, awsAuthDocument);
              });
            }
          );
        }
      }
    );
  };
};
