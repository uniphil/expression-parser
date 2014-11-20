/* get back the (hopefully) exact input expression from the AST */

var R = require('ramda');
var parse = require('./parse');


var template = function(str, vals) {
  var valIdx = 0;
  return str.replace(/#/g, function() { return vals[valIdx++]; });
};


var _echo = function _echo(node) {
  return template(node.template, R.map(_echo, node.children));
};


var echo = R.pipe(parse, _echo);
echo.fromAST = _echo;
module.exports = echo;
