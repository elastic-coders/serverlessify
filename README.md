# Serverlessify [![CircleCI](https://circleci.com/gh/elastic-coders/serverlessify.svg?style=svg)](https://circleci.com/gh/elastic-coders/serverlessify)

A tool to put back the server in Serverless functions!

Do you wanted to deploy your NodeJS AWS Lambda with Serverless but then you have been told:

> Well, you should just start with a monolith and broke it up in microservices later...

We have got you covered! Use Serverlessify to write a server which serves Serverless
lambdas as if they were on AWS. Later, actually deploying your lambdas with Serverless
will just be one command away.

## Usage

See [Serverlessify Starter Kit](https://github.com/elastic-coders/serverlessify-starter-kit)
for a full working usage example.

Install serverlessify with:

```
npm install --save serverlessify
```

Configure serverlessify and use it:

```javascript
const serverlessify = require('serverlessify');
const sls = serverlessify({ http, authorizers });
sls(
  { ... }, // Serverless configuration object
  { ... }  // Handlers
);
```

### Options

For the moment, only `http` events are supported

- `http`: (required) an map with http event handler configuration:

  - `eventHandler`: (required) An Express app instance that will be configured
    to work like AWS API Gateway for the Serverless funcitons that has an http
    event source.
  - `getPrincipalIdFromReq`: a function that should return a string sent to the
    lambda handler as `principalId`. The function will recive the http `req` parameter.
  - `wrapLambda`: a function that will be called with a lambda function as parameter.
    A new function should be returned with should in turn call the given lambda.
    This is useful if common logic like error handling or promise lambdas
    should be added to all http handle lambdas.
  - `authorizers`: a map of global authorizers that will be available to
    Serverless http event authorizer configuration as `arn`s
  - `authorizersCacheSet` a `function({key, value, ttl}, cb)` used to set an entry
    in a custom cache to save calls to the authorizer. ttl defaults to 300 (ms)
    and should be used to invalidate the cache if a `authorizersCacheGet` is
    received after that time. The callback `cb` should be called after the cache
    has been set.
  - `authorizersCacheGet` a `function(key, cb)` used to retireve a cached item.
    This function should call the callback with a falsy value if there is
    no cache for the given key or if the cache item is expired. The callback is
    a `function(error, value)`.
