'use strict';

module.exports.getObjectPath = function(path, obj) {
  let res = obj;
  const ps = Array.isArray(path) ? path : path.split('.');
  for (let p of ps) {
    if (!res) {
      break;
    }
    res = res[p];
  }
  return res;
};
