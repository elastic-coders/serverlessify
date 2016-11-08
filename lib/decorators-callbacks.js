'use strict';

module.exports.decorateLambdaReqCallback = function(getPrincipalId) {
  return function(req, res, next) {
    req.lambda = {
      event: {
        method: req.method,
        headers: req.headers,
        body: req.body,
        path: req.params,
        query: req.query,
        principalId: getPrincipalId && getPrincipalId(req),
        // stageVariables, // TODO define stageVariables
      },
      context: {},
    };
    next();
  };
};

const defaultCors = {
  origins: ['*'],
  methods: ['GET', 'PUT', 'HEAD', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  headers: ['Authorization', 'Content-Type', 'x-amz-date', 'x-amz-security-token', 'x-requested-with'],
};

module.exports.decorateAddCORSCallback = function(corsOpts) {
  let cors = defaultCors;
  if(corsOpts instanceof Object) {
    cors = Object.assign({}, defaultCors, corsOpts);
  }
  return function(req, res, next) {
    res.header('Access-Control-Allow-Methods', cors.methods.join(','));
    res.header('Access-Control-Allow-Headers', cors.headers.join(','));
    res.header('Access-Control-Allow-Origin', cors.origins.join(','));
    next();
  };
};
