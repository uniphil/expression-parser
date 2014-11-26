/* Get a function yielding an array of computed values for each node in the
 * AST, indexed by AST node id */

var R = require('ramda');
var parse = require('./parse');
var astFunc = require('./func').fromAST;


var _values = function(AST) {
  var funcs = [];
  (function collectFuncs(node) {
    funcs[node.id] = astFunc(node);
    node.children.forEach(collectFuncs);
  })(AST);
  return function(ctx) {
    return funcs.map(function(func) {
      return func(ctx);
    });
  };
};


var values = R.pipe(parse, _values);
values.fromAST = _values;
module.exports = values;
