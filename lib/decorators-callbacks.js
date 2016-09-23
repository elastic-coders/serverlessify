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

module.exports.decorateAddCORSCallback = function(isOptionMethod) {
  return function(req, res, next) {
    if(isOptionMethod) {
      res.header('Access-Control-Allow-Methods', 'GET,PUT,HEAD,PATCH,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Authorization,Content-Type,x-amz-date,x-amz-security-token');
    }
    res.header('Access-Control-Allow-Origin', '*');
    next();
  };
};
