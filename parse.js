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
      if (lex.check(token, {token: 'paren'})) {
        if (lex.check(token, {value: ')'})) { throw new ParseError('Unexpected close paren ")"'); }
        parenDepth += 1;
        subExprTokens = [];
        openTempl = token.repr;
      } else {
        outputTokens.push(token);
      }
    } else {
      if (lex.check(token, {token: 'paren'})) {
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

  if (lex.check(tR, {token: 'space'})) {
    // the very first (right-most) token could be whitespace
    t = R.cloneObj(t);
    templProp = lex.check(t) ? 'repr' : 'template';
    t[templProp] = t[templProp] + tR.repr;
    return [[tL, t], null];
  }
  if (lex.check(t, {token: 'space'})) {
    if (tL && (lex.check(tR, {token: 'literal'}) || lex.check(tR, {token: 'name'}))) {
      templProp = lex.check(tL) ? 'repr' : 'template';
      tL[templProp] += t.repr;
      return [[tL], tR];
    }
    templProp = lex.check(tR) ? 'repr' : 'template';
    tR[templProp] = t.repr + tR[templProp];
    return [[tL], tR];
  } else {
    return [[tL, t], tR];
  }
});


var assertNotOpToken = R.forEach(function(token) {
  if (lex.check(token, {token: 'operator'})) {
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
          !lex.check(tL, {token: 'operator'}) &&  // thing before isn't an op
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
    if (lex.check(t, {token: 'operator', value: symbol})) {
      return arys[ary](tL, t, tR);
    }
    return [[tL, t], tR];
  });
};


var pullFunctions = stepTrios(function(tL, t, tR) {
  // find [name, expr]s, and swap as fn(key=name, children=expr.children)
  if (lex.check(t, {token: 'name'}) && tR.node === 'expr') {
    return [[tL], astNode('func', tR.children, {
      key: t.value,
      template: t.repr + tR.template })];
  }
  return [[tL, t], tR];
});


var pullValues = R.map(function(token) {
  if (lex.check(token, {token: 'name'})) {
    return astNode('name', [],
      { key: token.value, template: token.repr });
  } else if (lex.check(token, {token: 'literal'})) {
    return astNode('literal', [],
      { value: parseFloat(token.value), template: token.repr });
  }
  return token;
});


var validateOperators = function(tokens) {
  var first = tokens[0],
      last = tokens[tokens.length - 1];
  if (lex.check(first, {token: 'operator'}) && !lex.check(first, {value: '-'})) {
    throw new ParseError('non-unary leading operator: ' + first.value);
  }
  if (lex.check(last, {token: 'operator'})) {
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


var actuallyEqualOps = function(wasLower, wasHigher) {
  function flipWithLastChild(node) {
    var newHeir = node.children.pop(),  // should be the last child! does not handle nAry
        switchedAtBirth = newHeir.children.shift();
    node.children.push(switchedAtBirth);
    newHeir.children.unshift(node);
    return newHeir;
  }

  function lookForFlips(node) {
    if (lex.check(node)) { return node; }
    if (node.node === 'func' && node.options.key === wasLower &&
        node.children[1] && node.children[1].node === 'func' && node.children[1].options.key === wasHigher) {
      node = flipWithLastChild(node);
    }
    R.forEach(lookForFlips, node.children);
    return node;
  }

  return R.map(lookForFlips);
};


var pullRoot = function(tokens) {
  var template = '';
  if (lex.check(tokens[0], {token: 'space'})) {
    template = tokens.shift().repr + template;
  }
  template += R.repeatN('#', tokens.length || 0).join('');
  return astNode('expr', tokens, {template: template});
};


var stampIds = function(rootNode) {
  var i = 0;
  (function stamper(node) {
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
  actuallyEqualOps('div', 'product'),  // makes * and / have equal precedence
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
