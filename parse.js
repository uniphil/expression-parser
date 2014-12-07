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
  var template = options.template || R.repeatN('#', children.length).join('');
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
        if (token.value === ')') { throw new ParseError('Unexpected close paren ")"'); }
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
  if (parenDepth !== 0) { throw new ParseError('Unclosed paren'); }
  return outputTokens;
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


var assertNotOpToken = R.forEach(function(token) {
  if (token && token.type === 'token' && token.token === 'operator') {
    throw new ParseError('sequential operator: ' + token.repr);
  }
});


var pullOps = function(symbol, ary, funcName, options) {
  var arys = {
    unary: function(tL, t, tR) {
      assertNotOpToken([tR]);
      var node = astNode('func', [tR],
        { key: funcName, template: t.repr + '#' });
      if (options.binarify &&
          tL &&  // it's not the first token
          !(tL.type === 'token' && tL.token === 'operator') &&  // thing before isn't an op
          !(tL.type === 'astNode' && tL.node === 'func')) {  // thing before isn't an op
        var injectedToken = lex.token('operator', options.binarify);
        injectedToken.repr = '';
        return [[tL, injectedToken, node], null];
      }
      return [[tL, node], null];
    },
    binary: function(tL, t, tR) {
      assertNotOpToken([tL, tR]);
      var node = astNode('func', [tL, tR],
        { key: funcName, template: '#' + t.repr + '#' });
      return [[node], null];
    },
    nary: function(tL, t, tR) {
      if (tR.type === 'ASTNode' && tR.node === 'func' && tR.options.key === funcName) {
        assertNotOpToken([tL, tR]);
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


var pullFunctions = stepTrios(function(tL, t, tR) {
  // find [name, expr]s, and swap as fn(key=name, children=expr.children)
  if (t.token === 'name' && tR.node === 'expr') {
    return [[tL], astNode('func', tR.children, {
      key: t.value,
      template: t.repr + tR.template })];
  }
  return [[tL, t], tR];
});


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
  if (first && first.token === 'operator' && first.value !== '-') {
    throw new ParseError('non-unary leading operator: ' + first.value);
  }
  if (last && last.token === 'operator') {
    throw new ParseError('trailing operator: ' + last.value);
  }
  return tokens;
};


var failOnBadTokens = function(tokens) {
  R.forEach(function(token) {
    throw new ParseError('could not parse token: ' + token.value);
  }, R.filter(R.where({token: null}), tokens));
  return tokens;
};


var pullRoot = function(tokens) {
  var templateStart = '',
      templateEnd = '',
      template;
  if (tokens[0] && tokens[0].type === 'token' && tokens[0].token === 'space') {
    templateStart = tokens.shift().repr;
  }
  if (tokens.slice(-1) && tokens.slice(-1).type === 'token' && tokens.slice(-1).token === 'space') {
    templateEnd = tokens.pop().repr;
  }
  template = templateStart + R.repeatN('#', tokens.length || 0).join('') + templateEnd;
  return astNode('expr', tokens, {template: template});
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
  pullSpaces,
  pullFunctions,
  pullValues,
  validateOperators,
  pullOps('^', 'binary', 'pow'),
  pullOps('-', 'unary', 'neg', {binarify: '+'}),
  pullOps('*', 'nary', 'product'),
  pullOps('/', 'binary', 'div'),
  pullOps('%', 'binary', 'mod'),
  pullOps('+', 'nary', 'sum'),
  pullOps('<', 'binary', 'lessThan'),
  pullOps('>', 'binary', 'greaterThan'),
  pullRoot
);

var parse = R.pipe(
  lex,
  failOnBadTokens,
  parseTokens,
  stampIds
);


parse.ParseError = ParseError;
parse.astNode = astNode;
parse.lex = lex;
parse.fromTokens = parseTokens;


module.exports = parse;
