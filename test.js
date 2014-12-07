require('mocha');
var assert = require('chai').assert;

var lex = require('./lex');
var parse = require('./parse');
var compileE = require('./echo');
var compileF = require('./func');
var compileV = require('./values');


describe('API', function() {
  describe('parser', function() {
    it('should export a function', function() {
      assert.typeOf(parse, 'function');
    });
    it('should expose the lexer', function() {
      assert.equal(parse.lex, lex);
    });
    it('should accept tokens via fromToken', function() {
      assert.typeOf(parse.fromTokens, 'function');
    });
  });
  describe('compilers', function() {
    it('should export a function', function() {
      assert.typeOf(compileE, 'function');
      assert.typeOf(compileF, 'function');
      assert.typeOf(compileV, 'function');
    });
    it('should accept an AST via fromAST', function() {
      assert.typeOf(compileE.fromAST, 'function');
      assert.typeOf(compileF.fromAST, 'function');
      assert.typeOf(compileV.fromAST, 'function');
    });
  });
});


describe('Lexer', function() {
  describe('individual symbols', function() {
    it('should detect the right type of token', function() {
      assert.propertyVal(lex(' ')[0], 'token', 'space', 'spaces are spaces');
      assert.propertyVal(lex('0')[0], 'token', 'literal', 'zero is a literal');
      assert.propertyVal(lex('1.5')[0], 'token', 'literal', '1.5 is a literal');
      assert.propertyVal(lex('a')[0], 'token', 'name', '"a" is a name');
      assert.propertyVal(lex('+')[0], 'token', 'operator', 'plus is an operator');
      assert.propertyVal(lex('-')[0], 'token', 'operator', 'minus is an operator');
      assert.propertyVal(lex('%')[0], 'token', 'operator', 'mod is an operator');
      assert.propertyVal(lex('*')[0], 'token', 'operator', 'multiply is an operator');
      assert.propertyVal(lex('/')[0], 'token', 'operator', 'divide is an operator');
      assert.propertyVal(lex('^')[0], 'token', 'operator', 'caret is an operator');
      assert.propertyVal(lex('<')[0], 'token', 'operator', 'less than is an operator');
      assert.propertyVal(lex('>')[0], 'token', 'operator', 'greater than is an operator');
      assert.propertyVal(lex('(')[0], 'token', 'paren', 'open parenthesis is a paren');
      assert.propertyVal(lex(')')[0], 'token', 'paren', 'close parenthesis is a paren');
    });
    it('should keep the right value', function() {
      assert.propertyVal(lex(' ')[0], 'value', ' ');
      assert.propertyVal(lex('a')[0], 'value', 'a');
      assert.propertyVal(lex('foo')[0], 'value', 'foo');
      assert.propertyVal(lex('+')[0], 'value', '+');
      assert.propertyVal(lex('%')[0], 'value', '%');
      assert.propertyVal(lex('(')[0], 'value', '(');
      // and on and on...
    });
  });
  describe('multi-symbol expressions', function() {
    it('should return an empty list for an empty expression', function() {
      assert.lengthOf(lex(''), 0, 'empty expressions are empty');
    });
    it('should return one symbol', function() {
      assert.lengthOf(lex(' '), 1, 'space is one symbol');
      assert.lengthOf(lex('  '), 1, 'spaces are grouped');
      assert.lengthOf(lex('a'), 1, 'a name is one symbol');
      assert.lengthOf(lex('foo'), 1, 'a name chan have multiple chars');
    });
    it('should return many symbols', function() {
      assert.lengthOf(lex('a b'), 3);
      assert.lengthOf(lex('a + b'), 5);
      assert.lengthOf(lex('a+b'), 3);
      assert.lengthOf(lex('2a'), 2, 'leading numbers are not part of a name');
      assert.lengthOf(lex('a2'), 1, 'names can have numbers after the first character');
      assert.lengthOf(lex('a2b'), 1, 'letters can follow numbers in names');
      assert.lengthOf(lex('a+'), 2, 'operators are not part of names');
      assert.lengthOf(lex('(1)'), 3);
      assert.lengthOf(lex('f()'), 3);
      assert.lengthOf(lex('.5'), 1, 'decimal numbers are one symbol');
      assert.lengthOf(lex('1.5'), 1, 'decimal numbers are one symbol');
      assert.lengthOf(lex('1.5.5'), 2, 'one number cannot have two dots.');
    });
  });
  describe('data structure', function() {
    it('should be defined for empty expressions', function() {
      assert.deepEqual(lex(''), [], 'empty expression -> empty list');
    });
    it('should otherswise be an array of objects', function() {
      assert.deepEqual(lex(' '), [{type: 'token', token: 'space', value: ' ', repr: ' '}]);
      assert.deepEqual(
        lex('2 + sin(t)'),
        [{type: 'token', token: 'literal', value: '2', repr: '2'},
         {type: 'token', token: 'space', value: ' ', repr: ' '},
         {type: 'token', token: 'operator', value: '+', repr: '+'},
         {type: 'token', token: 'space', value: ' ', repr: ' '},
         {type: 'token', token: 'name', value: 'sin', repr: 'sin'},
         {type: 'token', token: 'paren', value: '(', repr: '('},
         {type: 'token', token: 'name', value: 't', repr: 't'},
         {type: 'token', token: 'paren', value: ')', repr: ')'}]);
    });
  });
  describe('invalid tokens', function() {
    it('should give 1-char tokens of token: "null"', function() {
      assert.deepEqual(lex('!'), [{type: 'token', token: null, value: '!', repr: '!'}]);
      assert.deepEqual(
        lex('!@&'),
        [{type: 'token', token: null, value: '!', repr: '!'},
         {type: 'token', token: null, value: '@', repr: '@'},
         {type: 'token', token: null, value: '&', repr: '&'}]);
      assert.deepEqual(
        lex('abc!def'),
        [{type: 'token', token: 'name', value: 'abc', repr: 'abc'},
         {type: 'token', token: null, value: '!', repr: '!'},
         {type: 'token', token: 'name', value: 'def', repr: 'def'}]);
    });
  });
  describe('creates valid tokens', function() {
    it('should always have type: "token"', function() {
      assert.propertyVal(lex(' ')[0], 'type', 'token');
      assert.propertyVal(lex('0')[0], 'type', 'token');
      assert.propertyVal(lex('1.5')[0], 'type', 'token');
      assert.propertyVal(lex('a')[0], 'type', 'token');
      assert.propertyVal(lex('+')[0], 'type', 'token');
      assert.propertyVal(lex('-')[0], 'type', 'token');
      assert.propertyVal(lex('%')[0], 'type', 'token');
      assert.propertyVal(lex('*')[0], 'type', 'token');
      assert.propertyVal(lex('/')[0], 'type', 'token');
      assert.propertyVal(lex('^')[0], 'type', 'token');
      assert.propertyVal(lex('<')[0], 'type', 'token');
      assert.propertyVal(lex('>')[0], 'type', 'token');
      assert.propertyVal(lex('(')[0], 'type', 'token');
      assert.propertyVal(lex(')')[0], 'type', 'token');
    });
    it('should be an array of all type:"token"', function() {
      lex('1 + 1').map(function(token) {
        assert.propertyVal(token, 'type', 'token');
      });
    });
  });
});


describe('Parser', function() {
  describe('simple cases', function() {
    it('should parse a simple literal value', function() {
      assert.equal(parse('1').children[0].node, 'literal');
    });
    it('should parse a simple name', function() {
      assert.equal(parse('a').children[0].node, 'name');
    });
    it('should parse a function call', function() {
      assert.equal(parse('f(x)').children[0].node, 'func');
    });
    it('should parse operators', function() {
      assert.equal(parse('-1').children[0].node, 'func');
      assert.equal(parse('1-2').children[0].node, 'func');
      assert.equal(parse('1+2').children[0].node, 'func');
      assert.equal(parse('1%2').children[0].node, 'func');
      assert.equal(parse('1*2').children[0].node, 'func');
      assert.equal(parse('1/2').children[0].node, 'func');
      assert.equal(parse('1^2').children[0].node, 'func');
    });
    it('should puke on invalid operators', function() {
      assert.throws(function() { parse('$'); }, parse.ParseError);
    });
    it('should not die on whitespace', function() {
      assert.doesNotThrow(function() { parse(' 1'); }, parse.ParseError);
      assert.doesNotThrow(function() { parse('1 '); }, parse.ParseError);
      assert.doesNotThrow(function() { parse('1 + 1'); }, parse.ParseError);
    });
  });
  describe('parens', function() {
    it('should complain about mismatched parens', function() {
      assert.throws(function() { parse('('); }, parse.ParseError);
      assert.throws(function() { parse(')'); }, parse.ParseError);
      assert.throws(function() { parse('(()'); }, parse.ParseError);
      assert.throws(function() { parse('())'); }, parse.ParseError);
    });
    it('should parse contents as a subexpression', function() {
      assert.equal(parse('(1)').children[0].node, 'expr');
      assert.equal(parse('(1)').children[0].children[0].node, 'literal');
    });
    it('should put function expressions as children', function() {
      assert.equal(parse('sin(t)').children[0].node, 'func');
      assert.equal(parse('sin(t)').children[0].children[0].node, 'name');
    });
    it('should reject brackets', function() {
      assert.throws(function() { parse('[1]'); }, parse.ParseError);
    });
  });
  describe('operators', function() {
    it('should error for trailing operators', function() {
      assert.throws(function() { parse('1+'); }, parse.ParseError);
    });
    it('should error for leading non-unary operators', function() {
      assert.throws(function() { parse('*1'); }, parse.ParseError);
    });
  });
  describe('plus', function() {
    it('should pull minus into plus unary-minus', function() {
      assert.equal(parse('1-2').children[0].node, 'func');
      assert.equal(parse('1-2').children[0].children[1].node, 'func');
    });
    it('should pull unary minuses together', function() {
      assert.equal(parse('-1').children[0].node, 'func');
      assert.equal(parse('--1').children[0].node, 'func');
      assert.equal(parse('--1').children[0].children[0].node, 'func');
      assert.equal(parse('1--2').children[0].node, 'func');
      assert.equal(parse('1--2').children[0].children[1].node, 'func');
    });
    it('should group plusses', function() {
      assert.equal(parse('1+2+3').children[0].children.length, 3);
      assert.equal(parse('1+2+3').children[0].children[0].options.value, 1);
      assert.equal(parse('1+2+3').children[0].children[1].options.value, 2);
      assert.equal(parse('1+2+3').children[0].children[2].options.value, 3);
      assert.equal(parse('1+2-3').children[0].children.length, 3);
      assert.equal(parse('1-2+3').children[0].children.length, 3);
      assert.equal(parse('1-2-3').children[0].children.length, 3);
      assert.equal(parse('1-2-3').children[0].options.key, 'sum');
    });
  });
  describe('templating', function() {
    it('should attach spaces to the lower-precedent neighbour', function() {
      assert.equal(parse('1 + 1').children[0].template, '# + #');
    });
  });
  describe('ParseError', function() {
    it('should break if instantiated without "new" operator', function() {
      assert.throws(function() { parse.ParseError(); }, Error);
    });
    it('should stringify to the provided message', function() {
      assert.equal('' + (new parse.ParseError('abc')), 'abc');
    });
  });
  describe('node factory', function() {
    it('should create valid nodes with only a node name', function() {
      var node = parse.astNode('a');
      assert.equal(node.node, 'a');
      assert.deepEqual(node.children, []);
      assert.deepEqual(node.options, {});
    });
  });
  describe('regressions', function() {
    it('should work for 1^2-3', function() {
      assert.doesNotThrow(function() { parse('1^2-3'); }, parse.ParseError);
    });
    it('should work for 1--2', function() {
      assert.doesNotThrow(function() { parse('1--2'); }, parse.ParseError);
    });
    it('should work for unary negation after operators like 1+-1', function() {
      assert.doesNotThrow(function() { parse('1+-1'); }, parse.ParseError);
    });
    it('should error on dangling close paren', function() {
      assert.throws(function() { parse('1)'); }, parse.ParseError);
    });
    it('should error on dangling open paren', function() {
      assert.throws(function() { parse('1('); }, parse.ParseError);
    });
    it('should not die for expressions with no value', function() {
      assert.doesNotThrow(function() { parse(''); }, parse.ParseError);
    });
    it('should not die for expressions with 2 or more values', function() {
      assert.doesNotThrow(function() { parse('1 1'); }, parse.ParseError);
      assert.doesNotThrow(function() { parse('1 1 1'); }, parse.ParseError);
    });
    it('should throw properly for "-#" (from fuzzer)', function() {
      assert.throws(function() { parse('-#'); }, parse.ParseError);
    });
    it('should not die for a whitespace expression (fuzzer)', function() {
      assert.doesNotThrow(function() { parse(' '); });
    });
    it('should not die for weird fuzzer discovery: "a><b"', function() {
      assert.throws(function() { parse('a><b'); }, parse.ParseError);
    });
    it('should not die for weird fuzzer discovery: "a-+b"', function() {
      assert.throws(function() { parse('a-+b'); }, parse.ParseError);
    });
    it('should not die for weird fuzzer discovery: "a*+b"', function() {
      assert.throws(function() { parse('a*+b'); }, parse.ParseError);
    });
    it('should work on some samples from the mojulo gallery', function() {
      assert.doesNotThrow(function() {
        parse('x*y*time');
      }, parse.ParseError);
      assert.doesNotThrow(function() {
        parse('r*r*sin(time/30)');
      }, parse.ParseError);
      assert.doesNotThrow(function() {
        parse('x^2-y^2+time*3000');
      }, parse.ParseError);
      assert.doesNotThrow(function() {
        // note: had to remove % mod operators... should expression handle those???
        parse('10*((((100-x)^2+y^2)^0.5+time))+10*((((x)^2+y^2)^0.5+time))');
      }, parse.ParseError);
      assert.doesNotThrow(function() {
        parse('1270000*(cos(r/6-time/10)/r+cos((x*x+(y-100)*(y-100))^0.5/6-ti' +
              'me/10)/(x*x+(y-100)*(y-100))^0.5+1)');
      }, parse.ParseError);
      assert.doesNotThrow(function() {
        // note: add to add an arg to rand(), because expression does not currently
        // handle empty expressions
        parse('((((x+50*sin(time*0.05)-50*cos(time*0.05))-50)^2+((y-25*cos(ti' +
              'me*0.05)+25*sin(time*0.01))-50)^2)/100)-(rand(1)*7+sin((time-1' +
              '0000)*0.3)+1)^sin((time-10000)*0.07)-1800');
      }, parse.ParseError);
      assert.doesNotThrow(function() {
        parse('40*(sin((x-50)/(4+sin(time/2)))+(1/3)*sin(3*(x-50)/(4+sin(time' +
              '/2)))+(1/5)*sin(5*(x-50)/(4+sin(time/2))))*(sin((y-50)/(4+sin(' +
              'time/2)))+(1/3)*sin(3*(y-50)/(4+sin(time/2)))+(1/5)*sin(5*(y-5' +
              '0)/(4+sin(time/2))))');
      }, parse.ParseError);
    });
  });
});


describe('Echo compiler', function() {
  describe('on simple minimal-node ASTs', function() {
    it('should work on just whitespace', function() {
      assert.equal(compileE(' '), ' ');
    });
    it('should work for literals', function() {
      assert.equal(compileE('1'), '1');
    });
    it('should work for names', function() {
      assert.equal(compileE('a'), 'a');
    });
    it('should maintain whitespace', function() {
      assert.equal(compileE(' 1 '), ' 1 ');
    });
    it('should work for unary operators', function() {
      assert.equal(compileE('-1'), '-1');
      assert.equal(compileE('- 1'), '- 1');
      assert.equal(compileE('1-1'), '1-1');
    });
    it('should work for all binary operators', function() {
      assert.equal(compileE('1^1'), '1^1');
      assert.equal(compileE('1/ 1'), '1/ 1');
      assert.equal(compileE('1 %1'), '1 %1');
    });
    it('should work for nary operators', function() {
      assert.equal(compileE('1+1'), '1+1');
      assert.equal(compileE('1+1+1'), '1+1+1');
    });
    it('should work for nested expressions', function() {
      assert.equal(compileE('(1)'), '(1)');
      assert.equal(compileE(' ( 1 ) '), ' ( 1 ) ');
    });
    it('should work for functions', function() {
      assert.equal(compileE('sin(x)'), 'sin(x)');
      assert.equal(compileE(' sin (x)'), ' sin (x)');
    });
  });
  describe('on more interesting ASTs', function() {
    it('should work', function() {
      assert.equal(compileE('(1 + sin((x))) * 3^(sqrt(7) + 1)'),
        '(1 + sin((x))) * 3^(sqrt(7) + 1)');
    });
  });
  describe('regressions', function() {
    it('should work for multi-arg functions', function() {
      assert.equal(compileE('min(1 1)'), 'min(1 1)');
    });
  });
});


describe('Function compiler', function() {
  describe('literals', function() {
    it('should return them', function() {
      assert.equal(compileF('0')(), 0);
      /* istanbul ignore next */
      assert.equal(compileF('1')(), 1);
      /* istanbul ignore next */
      assert.equal(compileF('10')(), 10);
    });
    it('should not be affected by context', function() {
      assert.equal(compileF('0')({0: 1}), 0);
    });
  });
  describe('names', function() {
    it('should evaluate symbols from the provided context', function() {
      assert.equal(compileF('a')({a: 0}), 0);
      /* istanbul ignore next */
      assert.equal(compileF('foo')({foo: 1}), 1);
    });
    it('should ignore unused symbols', function() {
      assert.equal(compileF('0')({a: 1}), 0);
    });
    it('should return NaN when variables are missing from the context', function() {
      assert.ok(isNaN(compileF('a')()));
      /* istanbul ignore next */
      assert.ok(isNaN(compileF('1+a')()));
    });
    it('should work with literals', function() {
      assert.equal(compileF('1+a')({a: 1}), 2);
    });
    it('should follow BEDMAS operator precedence', function() {
      assert.equal(compileF('1/2*3')(), 1.5);
    });
    it('should execute named functions from the context', function() {
      /* istanbul ignore next */
      var ctx = { times2: function(n) { return n * 2; } };
      assert.equal(compileF('times2(1)')(ctx), 2);
    });
  });
  describe('invalid expressions', function() {
    it('should just let the parser throw on error', function() {
      assert.throws(function() { compileF('#'); }, parse.ParseError);
    });
  });
  describe('expressions with spaces', function() {
    it('should ignore spaces', function() {
      assert.equal(compileF(' 1')(), compileF('1')());
      /* istanbul ignore next */
      assert.equal(compileF('1 ')(), compileF('1')());
      /* istanbul ignore next */
      assert.equal(compileF('1 + 1')(), compileF('1+1')());
    });
  });
  describe('sample expressions', function() {
    it('should work', function() {
      var eps = 0.00001;  // TODO: pick a non-arbitrary acceptable error
      assert.equal(compileF('1+2*3^4/5')(), 33.4);
      /* istanbul ignore next */
      assert.equal(compileF('1>2')(), 0);
      /* istanbul ignore next */
      assert.equal(compileF('1>0')(), 1);
      /* istanbul ignore next */
      assert.equal(compileF('3%2')(), 1);
      /* istanbul ignore next */
      assert.equal(compileF('PI')(), Math.PI);
      /* istanbul ignore next */
      assert.closeTo(compileF('sin(PI)')(), 0, eps);
      /* istanbul ignore next */
      assert.closeTo(compileF('cos(PI)')(), -1, eps);
    });
    it('should handle the minus operator', function() {
      assert.equal(compileF('-1')(), -1);
    });
    it('should handle explicit floats', function() {
      assert.equal(compileF('0.5')(), 0.5);
    });
  });
  describe('regressions', function() {
    it('should not be sensitive to casing of constants in Math', function() {
      assert.equal(compileF('e')(), Math.E);
      /* istanbul ignore next */
      assert.equal(compileF('pi')(), Math.PI);
      /* istanbul ignore next */
      assert.equal(compileF('pI')(), Math.PI);
      /* istanbul ignore next */
      assert.equal(compileF('Pi')(), Math.PI);
      /* istanbul ignore next */
      assert.equal(compileF('PI')(), Math.PI);
    });
  });
});


describe('Value compiler', function() {
  describe('top-level solutions', function() {
    it('should agree with the plain function compiler', function() {
      assert.equal(compileV('1')()[0], compileF('1')());
    });
    it('should have a value for each AST node', function() {
      assert.equal(compileV('1')().length, 2);
      assert.equal(compileV('1+1')().length, 4);
    });
  });
});
