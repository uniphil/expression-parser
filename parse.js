var R = require('ramda');
var lex = require('./lex');


function ParseError(message) {
  if (!(this instanceof ParseError)) {
    throw new Error('Error throwing parse error -- pleas use the "new" ' +
      ' keyword. The parse error was:' + message);
  }
  this.toString = function() {
    return message;
  };
}


var parseTokens;  // implemented later; declared here because we recurse to it


var astNode = function(nodeType, children, options) {
  children = children || [];
  options = options || {};
  return {
    id: options.id || undefined,
    type: 'ASTNode',
    node: nodeType,
    // template: options.template || '#',
    children: children,
    options: options
  };
};


var parenDepthMod = function(token) {
  return (token.value === '(') ? +1 : -1;
};


var validateParens = function(tokens) {
  var checkParens = R.pipe(
    R.filter(R.where({type: 'paren'})),
    R.map(parenDepthMod),
    R.reduce(function(depth, depthChange) {
      var nextDepth = depth + depthChange;
      if (nextDepth < 0) { throw new ParseError('unexpected close paren'); }
      return nextDepth;
    }, 0),
    function(d) {
      if (d !== 0) { throw new ParseError('unmatched parentheses'); }
    }
  );
  checkParens(tokens);
  return tokens;
};

var pullOperator = function(symbol, ary, funcName) {
  var arys = {
    unary: function(tL, t, tR) {
      return [[tL, astNode('func', [tR], {key: funcName})], null];
    },
    binary: function(tL, t, tR) {
      return [[astNode('func', [tL, tR], {key: funcName})], null];
    },
    nary: function(tL, t, tR) {
      if (tR.type === 'ASTNode' && tR.node === 'func' && tR.options.key === funcName) {
        tR.children.unshift(tL);
        return [[tR], null];
      }
      return arys.binary(tL, t, tR);
    }
  };

  return function(tL, t, tR) {
    if (t.type === 'token' && t.token === 'operator' && t.value === symbol) {
      return arys[ary](tL, t, tR);
    }
    return [[tL, t], tR];
  };
};

var pullOps = function(opName, ary, funcName, preOp) {
  var puller = pullOperator(opName, ary, funcName, preOp);

  return function(tokens) {
    var pulled,
        output = [],
        tR = tokens.pop(),
        t = tokens.pop(),
        tL = tokens.pop();
    while (true) {
      if (!t) {
        output.unshift(tR);
        break;
      }
      pulled = puller(tL, t, tR);
      if (pulled[1] !== null) {
        output.unshift(pulled[1]);
      }
      tR = pulled[0].pop();
      t = pulled[0].pop() || tokens.pop();
      tL = tokens.pop();
    }
    return output;
  };
};


var injectToken = function(tokenToInject, options) {
  return function(tokens) {
    return R.reduce.idx(function(out, token, i, tokens) {
      if (token.type === 'ASTNode' && token.node === 'func' &&
          token.options.key === options.beforeOpNode &&
          tokens[i - 1]) {
        out.push(lex.token('operator', tokenToInject));
      }
      out.push(token);
      return out;
    }, [], tokens);
  };
};


var pullSubExpressions = function(tokens) {
  var token,
      parenDepth = 0,
      subExprTokens,
      subAST,
      outputTokens = [];

  for (var i = 0; i < tokens.length; i++) {
    token = tokens[i];
    if (parenDepth === 0) {
      if (token.token === 'paren') {
        parenDepth += 1;
        subExprTokens = [];
      } else {
        outputTokens.push(token);
      }
    } else {
      if (token.token === 'paren') {
        parenDepth += parenDepthMod(token);
        if (parenDepth === 0) {
          subAST = parseTokens(subExprTokens);
          outputTokens.push(subAST);
        } else {
          subExprTokens.push(token);
        }
      } else {
        subExprTokens.push(token);
      }
    }
  }
  return outputTokens;
};


var pullFunctions = function(tokens) {
  // find [name, expr]s, and swap as fn(key=name, children=expr.children)
  if (tokens.length < 2) {
    return tokens;  // there cannot be any functions
  }
  var outputTokens = [],
      token,
      exprNode;
  for (var i = 0; i < tokens.length - 1; i++) {
    token = tokens[i];
    exprNode = tokens[i + 1];
    if (token.token === 'name' && exprNode.node === 'expr') {
      outputTokens.push(astNode('func', exprNode.children, {key: token.value}));
      i++;  // skip over the expr token
    } else {
      outputTokens.push(token);
    }
  }
  if (outputTokens[outputTokens.length - 1].node !== 'func') {
    // if the last thing isn't a function's expression, we still want it
    outputTokens.push(tokens[tokens.length - 1]);
  }
  return outputTokens;
};


var validateHasValue = function(tokens) {
  var hasValue = R.reduce(function(foundValue, token) {
    if (R.contains(token.token, ['literal', 'name']) || token.node === 'expr') {
      return true;
    } else {
      return foundValue;
    }
  }, false);
  if (!hasValue(tokens)) {
    throw new ParseError('Expression has no value ' + JSON.stringify(tokens));
  }
  return tokens;
};


var pullValues = R.map(function(token) {
  if (token.type === 'token') {
    if (token.token === 'name') {
      return astNode('name', [], { key: token.value });
    } else if (token.token === 'literal') {
      return astNode('literal', [], { value: parseFloat(token.value) });
    }
  }
  return token;
});


var validateOperators = function(tokens) {
  var first = tokens[0],
      last = tokens[tokens.length - 1];
  if (first.token === 'operator' && first.value !== '-') {
    throw new ParseError('non-unary leading operator: ' + first.value);
  }
  if (last.token === 'operator') {
    throw new ParseError('trailing operator: ' + last.value);
  }
  return tokens;
};


var validateOneValue = function(nodes) {
  if (nodes.children.length !== 1) {
    throw new ParseError('The expression must resolve to exactly one value');
  }
  return nodes;
};


var stampIds = function(rootNode) {
  var i = 0;
  (function stamper(node) {
    if (node.id) { throw new Error('node already has an id?'); }
    node.id = i++;
    R.forEach(stamper, node.children);
  })(rootNode);
  return rootNode;
};


parseTokens = R.pipe(
  pullSubExpressions,
  validateHasValue,
  pullFunctions,
  pullValues,
  validateOperators,
  pullOps('^', 'binary', 'pow'),
  pullOps('-', 'unary', 'neg'),
  injectToken('+', {beforeOpNode: 'neg'}),
  pullOps('*', 'nary', 'product'),
  pullOps('/', 'binary', 'div'),
  pullOps('%', 'binary', 'mod'),
  pullOps('+', 'nary', 'sum'),
  pullOps('<', 'binary', 'lessThan'),
  pullOps('>', 'binary', 'greaterThan'),
  R.curryN(2, astNode)('expr')
);

var parse = R.pipe(
  lex,
  validateParens,
  parseTokens,
  validateOneValue,
  stampIds
);


parse.ParseError = ParseError;
parse.astNode = astNode;
parse.lex = lex;
parse.parseTokens = parseTokens;


module.exports = parse;
