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
  var template = options.template || '#';
  delete options.template;
  return {
    id: options.id || undefined,
    type: 'ASTNode',
    node: nodeType,
    template: template,
    children: children,
    options: options
  };
};


var parenDepthMod = function(token) {
  return (token.value === '(') ? +1 : -1;
};


var pullSubExpressions = function(tokens) {
  var token,
      parenDepth = 0,
      subExprTokens,
      subAST,
      outputTokens = [],
      openTempl;

  for (var i = 0; i < tokens.length; i++) {
    token = tokens[i];
    if (parenDepth === 0) {
      if (token.token === 'paren') {
        parenDepth += 1;
        subExprTokens = [];
        openTempl = token.repr;
      } else {
        outputTokens.push(token);
      }
    } else {
      if (token.token === 'paren') {
        parenDepth += parenDepthMod(token);
        if (parenDepth === 0) {
          subAST = parseTokens(subExprTokens);
          subAST.template = openTempl + subAST.template + token.repr;
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


var stepTrios = function(puller) {
  // steps right to left

  var getTrio = function(leftovers, tokens) {
    return [
      leftovers.pop() || tokens.pop(),
      leftovers.pop() || tokens.pop(),
      leftovers.pop() || tokens.pop()
    ].reverse();
  };

  return function(tokens) {
    var pulled = [[], null],
        output = [],
        trio;
    while (true) {
      trio = getTrio(pulled[0], tokens);
      if (!trio[1]) {
        if (trio[2]) { output.unshift(trio[2]); }
        break;
      }
      pulled = puller.apply(null, trio);
      if (pulled[1] !== null) {
        output.unshift(pulled[1]);
      }
    }
    return output;
  };
};


var pullSpaces = stepTrios(function(tL, t, tR) {
  tR = R.cloneObj(tR);
  var templProp;

  if (tR.type === 'token' && tR.token === 'space') {
    // the very first (right-most) token could be whitespace
    t = R.cloneObj(t);
    templProp = t.type === 'token' ? 'repr' : 'template';
    t[templProp] = t[templProp] + tR.repr;
    return [[tL, t], null];
  }
  if (t.type === 'token' && t.token === 'space') {
    templProp = tR.type === 'token' ? 'repr' : 'template';
    tR[templProp] = t.repr + tR[templProp];
    return [[tL], tR];
  } else {
    return [[tL, t], tR];
  }
});


var pullOps = function(symbol, ary, funcName) {
  var arys = {
    unary: function(tL, t, tR) {
      var node = astNode('func', [tR],
        { key: funcName, template: t.repr + '#' });
      return [[tL, node], null];
    },
    binary: function(tL, t, tR) {
      var node = astNode('func', [tL, tR],
        { key: funcName, template: '#' + t.repr + '#' });
      return [[node], null];
    },
    nary: function(tL, t, tR) {
      if (tR.type === 'ASTNode' && tR.node === 'func' && tR.options.key === funcName) {
        tR.children.unshift(tL);
        tR.template = '#' + t.repr + tR.template;
        return [[tR], null];
      }
      return arys.binary(tL, t, tR);
    }
  };

  return stepTrios(function(tL, t, tR) {
    if (t.type === 'token' && t.token === 'operator' && t.value === symbol) {
      return arys[ary](tL, t, tR);
    }
    return [[tL, t], tR];
  });
};


var injectToken = function(tokenToInject, options) {
  return function(tokens) {
    return R.reduce.idx(function(out, token, i, tokens) {
      if (token.type === 'ASTNode' && token.node === 'func' &&
          token.options.key === options.beforeOpNode &&
          tokens[i - 1]) {
        var injectedToken = lex.token('operator', tokenToInject);
        injectedToken.repr = '';
        out.push(injectedToken);
      }
      out.push(token);
      return out;
    }, [], tokens);
  };
};


var pullFunctions = stepTrios(function(tL, t, tR) {
  // find [name, expr]s, and swap as fn(key=name, children=expr.children)
  if (t.token === 'name' && tR.node === 'expr') {
    return [[tL], astNode('func', tR.children, {key: t.value,
      template: t.repr + tR.template})];
  }
  return [[tL, t], tR];
});


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
      return astNode('name', [],
        { key: token.value, template: token.repr });
    } else if (token.token === 'literal') {
      return astNode('literal', [],
        { value: parseFloat(token.value), template: token.repr });
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
  pullSpaces,
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
