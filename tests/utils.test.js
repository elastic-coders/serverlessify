const expect = require('chai').expect;
const subject = require('../lib/utils');

describe('utils', () => {
  it('should export utils methods', () => {
    expect(subject.getObjectPath).to.be.a('function');
  });

  describe('getObjectPath', () => {
    const getObjectPath = subject.getObjectPath;

    it('should get an object path with an array path', () => {
      const testObject = {
        a: { b: [null, { c: 'test' } ] },
      };
      expect(getObjectPath(['a', 'b', 1, 'c'], testObject)).to.equal('test');
    });

    it('should get an object path with a string path', () => {
      const testObject = {
        a: { b: [null, { c: 'test' } ] },
      };
      expect(getObjectPath('a.b.1.c', testObject)).to.equal('test');
    });

    it('should should return undefined when path is not found', () => {
      const testObject = {
        a: { NOTFOUND: [null, { c: 'test' } ] },
      };
      expect(getObjectPath(['a', 'b', 1, 'c'], testObject)).not.to.exists;
    });
  });
});
