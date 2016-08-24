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
  return function(req, res, next) {
    const sources = {
      method: {
        request: {
          header: req.headers,
        },
      },
    };
    const source = getObjectPath(
      (identitySource || 'method.request.header.Auth').toLowerCase(),
      sources
    );
    if (identityValidationRegExp && identityValidationRegExp.exec(source) === null) {
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
        methodArn: `arn:serverlessify:execute-api:${arnOptions.regionId}:${arnOptions.accountId}:${arnOptions.apiId}/${method}${resourcePath}`,
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
  getCacheEntry
) {
  return function(req, res, next) {
    if (!authorizer) {
      return next();
    }

    function authorizerCallback(err, awsAuthDocument) {
      // TODO addCacheEntry(req.lambda.authorizer.event.authorizationToken, awsAuthDocument).then
      if (err) {
        res.status(500).send(err);
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

    const cacheKey = req.lambda.authorizer.event.authorizationToken;
    (getCacheEntry || function(i, cb) { cb() })(
      cacheKey,
      function(err, cachedAuthorization) {
        if (cachedAuthorization) {
          authorizerCallback(err, cachedAuthorization);
        } else {
          authorizer(
            req.lambda.authorizer.event,
            req.lambda.context,
            function(innerErr, awsAuthDocument) {
              (setCacheEntry || function(i, cb) { cb() })({
                key: cacheKey,
                value: awsAuthDocument,
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
