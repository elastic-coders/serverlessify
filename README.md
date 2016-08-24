# Serverlessify

A tool to put back the server in Serverless functions!

Do you wanted to deploy your NodeJS AWS Lambda with Serverless but then you thought:

> Well, I'll just start with a monolith and broke it up in microservices later...

We have got you covered! Use Serverlessify to write a server which serves Serverless
lambdas as if they were on AWS. Later, actually deploying your lamndas with Serverless
will just be one command away.

## Usage

- `npm install serverlessify`
- `const serverlessify = require('serverlessify');`
- `const sls = serverlessify({ http, authorizers });`
- `sls({ ... }, { ... })`

## What's supported

- html
  - cors
  - authorizer

## Best practices

## Examples