var R = require('ramda');
var parse = require('./parse');


var transformers = {
  expr: function(node) {
    return { c: function(vals) { return '(' + vals[0] + ')'; },
             subs: [node.expr] };
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
             subs: node.args };
  },
  operator: function(node) {
    if (node.op === 'power') {
      // special case grr
      return {
        c: function powerize(args) {
          if (args.length === 1) { return args[0]; }
          return 'symbols["pow"](' + args[0] + ', ' + powerize(args.slice(1)) + ')';
        },
        subs: node.args
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
             subs: node.args };
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


var asmCompileAST = (function(transformers) {
  var ASMTransformers = R.mixin(transformers, {
    name: function(node) {
      return {
        c: function() { return node.key; },
        subs: []
      };
    },
    func: function(node) {
      return {
        c: function(args) { return '+' + node.key + '(' + args[0] + ')'; },
        subs: node.args
      };
    },
    operator: function(node) {
      if (node.op === 'power') {
        // special case grr
        return {
          c: function powerize(args) {
            if (args.length === 1) { return args[0]; }
            return '+pow(' + args[0] + ', ' + powerize(args.slice(1)) + ')';
          },
          subs: node.args
        };
      } else {
        return transformers.operator(node);
      }
    }
  });
  return function asmComp(ASTNode, funcs, vars) {
    funcs = funcs || [];
    vars = vars || [];
    if (ASTNode.type === 'name' && !R.contains(ASTNode.key, vars)) {
      vars.push(ASTNode.key);
    } else if (ASTNode.type === 'func' && !R.contains(ASTNode.key, funcs)) {
      funcs.push(ASTNode.key);
    } else if (ASTNode.type === 'operator' && ASTNode.op === 'power' && !R.contains('pow', funcs)) {
      // special-case grr...
      funcs.push('pow');
    }
    var transformer = ASMTransformers[ASTNode.type](ASTNode);
    return {
      expr: transformer.c(R.map(function(node) {
        return asmComp(node, funcs, vars).expr;
      }, transformer.subs)),
      funcs: funcs,
      vars: vars
    };
  };
})(transformers);


var _ASMTemplate = function(stdlib, foreign) {
  'use asm';

  var sin = stdlib.Math.sin;
  var f = foreign.f;

  function exec(t) {
    t = +t;
    return +(+f(+sin(t)));
  }

  return { exec: exec };
};


var asmify = function(stuff) {
  var g = (typeof window !== 'undefined') ? window : global;
  var expr = stuff.expr,
      vars = stuff.vars,
      stds = R.filter(function(f) { return !!g.Math[f]; }, stuff.funcs),
      funcs = R.difference(stuff.funcs, stds);

  var importStd = function(imports) {
    return imports
      .map(function(i) { return 'var ' + i + ' = stdlib.Math.' + i + ';'; })
      .join('\n');
  };
  var importForeign = function(foreigns) {
    return foreigns
      .map(function(f) { return 'var ' + f + ' = foreign.' + f + ';'; })
      .join('\n');
  };
  var acceptVars = function(vars) {
    return 'exec(' + vars.join(', ') + ')';
  };
  var coerceVars = function(vars) {
    return vars
      .map(function(v) { return v + ' = +' + v + ';'; })
      .join('\n');
  };

  var body = _ASMTemplate.toString()
    .split('\n')
    .slice(1, -1)
    .join('\n')
    .replace('var sin = stdlib.Math.sin;', importStd(stds))
    .replace('var f = foreign.f;', importForeign(funcs))
    .replace('exec(t)', acceptVars(vars))
    .replace('t = +t;', coerceVars(vars))
    .replace('+f(+sin(t))', expr);

  /* jslint evil:true */
  var asmFn = new Function('stdlib', 'foreign', body);
  /* jslint evil:false */

  var exec = asmFn(g, {}).exec;

  return function(ctx) {
    var args = vars.map(function(v) { return ctx[v]; });
    return exec.apply(null, args);
  };
};


var compile = R.pipe(
  parse,
  compileAST,
  functionify
);


var asmCompile = R.pipe(
  parse,
  asmCompileAST,
  asmify
);


compile.compileAST = compileAST;
compile.asm = asmCompile;
compile.asm.compileAST = asmCompileAST;

module.exports = compile;
