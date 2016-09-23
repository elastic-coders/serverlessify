'use strict';

module.exports.executeLambdaCallback = function(handlerFunction) {
  return function(req, res) {
    handlerFunction(
      req.lambda.event,
      req.lambda.context,
      function(err, resp) {
        if (err) {
          res.status(err.status || 500).send(err);
        } else {
          res.status(200).send(resp);
        }
      }
    );
  };
};
