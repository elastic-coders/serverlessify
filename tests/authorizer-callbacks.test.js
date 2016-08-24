const expect = require('chai').expect;
const sinon = require('sinon');
const subject = require('../lib/authorizer-callbacks');
require('chai').use(require('sinon-chai'));

describe('utils', () => {
  it('should define callbacks', () => {
    expect(subject.authorizerValidationCallback).to.be.a('function');
    expect(subject.authorizerCheckCallback).to.be.a('function');
  });
});

