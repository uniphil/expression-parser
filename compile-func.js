var R = require('ramda');
var parse = require('./parse');


var transformers = {
  expr: function(node) {
    return { c: function(vals) { return '(' + vals[0] + ')'; },
             subs: node.children };
  },
  literal: function(node) {
    var str = '' + node.value;
    if (!R.contains('.', str)) {
      str += '.0';
    }
    return { c: function() { return str; },
             subs: [] };
  },
  name: function(node) {
    return { c: function() { return 'symbols["' + node.key + '"]'; },
             subs: [] };
  },
  func: function(node) {
    return { c: function(args) { return 'symbols["' + node.key + '"]' + '(' + args[0] + ')'; },
             subs: node.children };
  },
  operator: function(node) {
    if (node.op === 'power') {
      // special case grr
      return {
        c: function powerize(args) {
          if (args.length === 1) { return args[0]; }
          return 'symbols["pow"](' + args[0] + ', ' + powerize(args.slice(1)) + ')';
        },
        subs: node.children
      };
    }
    var symbols = {
      times: '*',
      over: '/',
      mod: '%',
      plus: '+',
      minus: '-',
      less: '<',
      greater: '>'
    };
    return { c: function(args) {
      return '(' + R.join(symbols[node.op], args) + ')'; },
             subs: node.children };
  }
};


var compileAST = function comp(ASTNode) {
  var transformer = transformers[ASTNode.type](ASTNode);
  return transformer.c(R.map(comp, transformer.subs));
};


var functionify = function(expr) {
  var templateFn = function(symbols, expr) {
    symbols = symbols || {};
    return expr;
  };
  var body = templateFn
    .toString()
    .split('\n')
    .slice(1, -1)  // drop function header and closing }
    .join('\n')
    .replace('expr', expr);
  /* jslint evil:true */
  return new Function('symbols', body);
  /* jslint evil:false */
};


var compile = R.pipe(
  parse,
  compileAST,
  functionify
);


compile.compileAST = compileAST;

module.exports = compile;
