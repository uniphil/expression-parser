var R = require('ramda');
var parse = require('./parse');


var transformers = {
  expr: function(node) {
    return { c: function(vals) { return '(' + vals[0] + ')'; },
             subs: node.children };
  },
  literal: function(node) {
    var str = '' + node.options.value;
    if (!R.contains('.', str)) {
      str += '.0';
    }
    return { c: function() { return str; },
             subs: [] };
  },
  name: function(node) {
    var key = node.options.key,
        upperKey = key.toUpperCase();
    if (R.prop(upperKey, Math)) {
      return {
        c: function() {
          return 'Math.' + upperKey;
        },
        subs: []
      };
    }
    return {
      c: function() {
        return 'symbols["' + key + '"]';
      },
      subs: []
    };
  },
  func: function(node) {
    var key = node.options.key;
    var narys = {
      product: '*',
      div: '/',
      mod: '%',
      sum: '+',
      minus: '-',
      lessThan: '<',
      greaterThan: '>'
    };
    if (narys[key]) {
      return {
        c: function(args) { return '(' + args.join(narys[key]) + ')'; },
        subs: node.children
      };
    }
    if (key === 'neg') {
      return {
        c: function(args) { return '(-' + args[0] + ')'; },
        subs: node.children
      };
    }
    if (R.prop(key, Math)) {
      return {
        c: function(args) { return 'Math.' + key + '(' + args.join(',') + ')'; },
        subs: node.children
      };
    }
    return { c: function(args) { return 'symbols["' + node.options.key + '"]' +
      '(' + args.join(',') + ')'; }, subs: node.children };
  }
};


var compileAST = function comp(ASTNode) {
  var transformer = transformers[ASTNode.node](ASTNode);
  return transformer.c(R.map(comp, transformer.subs));
};


var functionify = function(expr) {
  /* istanbul ignore next */
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


var compile = R.pipe(parse, compileAST, functionify);
compile.fromAST = R.pipe(compileAST, functionify);
compile.express = R.pipe(parse, compileAST);
compile.express.fromAST = compileAST;

module.exports = compile;
