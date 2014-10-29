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


var parseTokens;  // declared because we recurse to it


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


var normalizeBinary = function(symbol, op, becomes, ident) {
  return function(tokens) {
    // [a, symbol, b] => [a, becomes, (op, b)]
    // obvious unaries have already been pulled
    var outputTokens = [],
        token,
        tokenBefore,
        tokenAfter;
    for (var i = 0; i < tokens.length; i++) {
      tokenBefore = tokens[i - 1];
      tokenAfter = tokens[i + 1];
      token = tokens[i];
      if (token.type === 'operator' && token.value === symbol) {
        var lastOut = outputTokens[outputTokens.length - 1];
        if (!lastOut || R.prop('normalized', lastOut) !== becomes) {
          outputTokens.push(tokenBefore);
        }
        outputTokens.push({
          type: 'operator',
          op: becomes,
          normalized: becomes,
          children: [{
            type: 'operator',
            op: op,
            children: [{
              type: 'literal',
              template: '' + ident,
              value: ident
            }, tokenAfter]
          }]
        });
        i++;
      } else {
        if (!(tokenAfter && tokenAfter.type === 'operator' && tokenAfter.value === symbol)) {
          outputTokens.push(token);
        }
      }
    }
    return outputTokens;
  };
};


var pullBinary = function(symbol, op) {
  return function(tokens) {
    var outputTokens = [],
        prevToken,
        token,
        nextToken;
    for (var i = 0; i < tokens.length; i++) {
      prevToken = tokens[i - 1];
      nextToken = tokens[i + 1];
      token = tokens[i];
      var lastOut = outputTokens[outputTokens.length - 1];
      if (token.type === 'operator' && token.value === symbol) {
        if (lastOut && lastOut.type === 'operator' && lastOut.op === op) {
          lastOut.children.push(tokens[i + 1]);
          i++;
        } else {
          var outputToken = {
            type: 'operator',
            op: op,
            children: [prevToken]
          };
          if (nextToken.type === 'operator' && nextToken.op === op) {
            var merging = nextToken.children;
            Array.prototype.push.apply(outputToken.children, merging);
            i += merging.length;
          } else {
            outputToken.children.push(nextToken);
            i++;
          }
          outputTokens.push(outputToken);
        }
      } else if (token.type === 'operator' && token.op === op) {
        if (prevToken && !(prevToken.type === 'operator' &&
            (prevToken.op === op || prevToken.value === symbol))) {
          if (lastOut) {
            Array.prototype.push.apply(lastOut.children, token.children);
          } else {
            token.children.unshift(prevToken);
            outputTokens.push(token);
          }
        } else {
          outputTokens.push(token);
        }
        if (nextToken && nextToken.type === 'operator' && nextToken.op === op) {
          Array.prototype.push.apply(token.children, nextToken.children);
          i += nextToken.children.length;
        }
      } else {
        if (!(nextToken && nextToken.type === 'operator' &&
              (nextToken.value === symbol || nextToken.op === op))) {
          outputTokens.push(token);
        }
      }
    }
    return outputTokens;
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
      if (token.type === 'paren') {
        parenDepth += 1;
        subExprTokens = [];
      } else {
        outputTokens.push(token);
      }
    } else {
      if (token.type === 'paren') {
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
  // find [name, expr]s, and swap name->fn(subexpr)
  if (tokens.length < 2) {
    return tokens;  // there cannot be any functions
  }
  var outputTokens = [],
      token,
      nextToken;
  for (var i = 1; i < tokens.length; i++) {
    token = tokens[i - 1];
    nextToken = tokens[i];
    if (token.type === 'name' && nextToken.type === 'expr') {
      outputTokens.push({
        type: 'func',
        key: token.value,
        template: token.value + '#',
        children: [nextToken]
      });
      i++;
    } else {
      outputTokens.push(token);
    }
  }
  if (outputTokens[outputTokens.length - 1].type !== 'func') {
    // if the last thing isn't a function's expression, we still want it
    outputTokens.push(tokens[tokens.length - 1]);
  }
  return outputTokens;
};


var validateHasValue = function(tokens) {
  var hasValue = R.reduce(function(foundValue, token) {
    if (R.contains(token.type, ['literal', 'name', 'expr'])) {
      return true;
    } else {
      return foundValue;
    }
  }, false);
  if (!hasValue(tokens)) {
    throw new ParseError('Expression has no value');
  }
  return tokens;
};


var pullValues = R.map(function(token) {
  if (token.type === 'name') {
    return {
      type: 'name',
      template: token.value,
      key: token.value
    };
  } else if (token.type === 'literal') {
    return {
      type: 'literal',
      template: token.value,
      value: parseFloat(token.value)
    };
  } else {
    return token;
  }
});


var validateOperators = function(tokens) {
  var first = tokens[0],
      last = tokens[tokens.length - 1];
  if (first.type === 'operator' && !R.contains(first.value, '+-')) {
    throw new ParseError('non-unary leading operator: ' + first.value);
  }
  if (last.type === 'operator') {
    throw new ParseError('trailing operator: ' + last.value);
  }
  return tokens;
};

var simplifyUnaryPlus = function(tokens) {
  // simlify to just its thing
  // TODO: keep it as part of the token's format string
  var token,
      tokenBefore,
      outputTokens = [];
  for (var i = tokens.length - 1; i >= 0; i--) {
    tokenBefore = tokens[i - 1];
    token = tokens[i];
    if (token.type === 'operator' && token.value === '+') {
      if (tokenBefore && tokenBefore.type !== 'operator') {
        outputTokens.unshift(token);
      }
    } else {
      outputTokens.unshift(token);
    }
  }
  return outputTokens;
};

var pullUnaryMinus = function(tokens) {
  var outputTokens = [],
      token,
      prevToken,
      nextToken;
  for (var i = tokens.length - 1; i >= 0; i--) {
    token = tokens[i];
    prevToken = tokens[i - 1];
    nextToken = tokens[i + 1];
    if (token.type === 'operator' && token.value === '-') {
      if (!prevToken || prevToken.type === 'operator' && prevToken.op !== 'power') {
        var prevOut = outputTokens[0],
            argToken;
        if (prevOut && prevOut.type === 'operator' && prevOut.op === 'minus') {
          argToken = outputTokens.shift();
        } else {
          argToken = nextToken;
        }
        outputTokens.unshift({
          type: 'operator',
          op: 'minus',
          children: [{
            type: 'literal',
            value: 0
          }, argToken]
        });
      } else {
        if (!(nextToken && nextToken.type === 'operator' && nextToken.value === '-')) {
          outputTokens.unshift(nextToken);  // we skipped it because we saw - coming
        }
        outputTokens.unshift(token);
      }
    } else {
      if (!(prevToken && prevToken.type === 'operator' && prevToken.value === '-')) {
        outputTokens.unshift(token);
      } // else skip -- minus coming next
    }
  }
  return outputTokens;
};


var pullPowers = pullBinary('^', 'power');

var fixDivisons = normalizeBinary('/', 'over', 'times', 1);

var pullTimes = pullBinary('*', 'times');

var pullMod = pullBinary('%', 'mod');

var fixBinaryMinus = normalizeBinary('-', 'minus', 'plus', 0);

var pullPlus = pullBinary('+', 'plus');

var pullLT = pullBinary('<', 'less');

var pullGT = pullBinary('>', 'greater');


var wrapExpr = function(tokens) {
  if (tokens.length > 1) {
    console.error('wrapping', JSON.stringify(tokens, null, 2));
    throw new ParseError('err.. ??? could not wrap more than one ast node in expr');
  }
  return {
    type: 'expr',
    children: tokens
  };
};

parseTokens = R.pipe(
  pullSubExpressions,
  validateHasValue,
  pullFunctions,
  pullValues,
  validateOperators,
  simplifyUnaryPlus,
  pullPowers,
  pullUnaryMinus,
  fixDivisons,
  pullTimes,
  pullMod,
  fixBinaryMinus,
  pullPlus,
  pullLT,
  pullGT,
  wrapExpr
);

var parse = R.pipe(
  lex,
  validateParens,
  parseTokens
);


parse.ParseError = ParseError;

parse.lex = lex;
parse.parseTokens = parseTokens;


module.exports = parse;
