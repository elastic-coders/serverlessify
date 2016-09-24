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

module.exports.decorateAddCORSCallback = function(corsOpts, isOptionMethod) {
  // TODO: get default cors options from variables
  const cors = {
    origins: ['*'],
    methods: ['GET', 'PUT', 'HEAD', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    headers: ['Authorization', 'Content-Type', 'x-amz-date', 'x-amz-security-token']
  };
  if(corsOpts instanceof Object) {
    Object.assign(cors, corsOpts);
  } else if(corsOpts != true) {
    throw new Error('Invalid cors configuration!');
  }
  return function(req, res, next) {
    if(isOptionMethod) {
      res.header('Access-Control-Allow-Methods', cors.methods.join(','));
      res.header('Access-Control-Allow-Headers', cors.headers.join(','));
    }
    res.header('Access-Control-Allow-Origin', cors.origins.join(','));
    next();
  };
};
