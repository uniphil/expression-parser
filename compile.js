var R = require('ramda');
var parse = require('./parse');


var transformers = {
  expr: function(node) {
    return { c: function(vals) { return '(' + vals[0] + ')'; },
             subs: [node.expr] };
  },
  literal: function(node) {
    return { c: function() { return '' + node.value; },
             subs: [] };
  },
  name: function(node) {
    return { c: function() { return 'symbols["' + node.key + '"]'; },
             subs: [] };
  },
  func: function(node) {
    return { c: function(args) { return 'symbols["' + node.key + '"]' + '(' + args[0] + ')'; },
             subs: node.args };
  },
  operator: function(node) {
    var symbols = {
      power: '^',
      times: '*',
      over: '/',
      plus: '+',
      minus: '-',
      less: '<',
      greater: '>'
    };
    return { c: function(args) {
      return '(' + R.join(symbols[node.op], args) + ')'; },
             subs: node.args };
  }
};


var compileAST = function comp(ASTNode) {
  var transformer = transformers[ASTNode.type](ASTNode);
  return transformer.c(R.map(comp, transformer.subs));
};


var compile = R.pipe(
  parse,
  compileAST
);


compile.compileAST = compileAST;

module.exports = compile;
