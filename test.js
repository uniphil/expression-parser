require('mocha');
var assert = require('chai').assert;

var parse = require('./parse');


describe('Lexer', function() {
  var lex = parse.lex;

  describe('individual symbols', function() {
    it('should detect the right type of token', function() {
      assert.propertyVal(lex(' ')[0], 'type', 'space', 'spaces are spaces');
      assert.propertyVal(lex('0')[0], 'type', 'literal', 'zero is a literal');
      assert.propertyVal(lex('1.5')[0], 'type', 'literal', '1.5 is a literal');
      assert.propertyVal(lex('a')[0], 'type', 'name', '"a" is a name');
      assert.propertyVal(lex('+')[0], 'type', 'operator', 'plus is an operator');
      assert.propertyVal(lex('-')[0], 'type', 'operator', 'minus is an operator');
      assert.propertyVal(lex('*')[0], 'type', 'operator', 'multiply is an operator');
      assert.propertyVal(lex('/')[0], 'type', 'operator', 'divide is an operator');
      assert.propertyVal(lex('^')[0], 'type', 'operator', 'caret is an operator');
      assert.propertyVal(lex('<')[0], 'type', 'operator', 'less than is an operator');
      assert.propertyVal(lex('>')[0], 'type', 'operator', 'greater than is an operator');
      assert.propertyVal(lex('(')[0], 'type', 'paren', 'open parenthesis is a paren');
      assert.propertyVal(lex(')')[0], 'type', 'paren', 'close parenthesis is a paren');
      assert.propertyVal(lex('[')[0], 'type', 'paren', 'open bracket is a paren');
      assert.propertyVal(lex(']')[0], 'type', 'paren', 'close bracket is a paren');
    });
    it('should keep the right value', function() {
      assert.propertyVal(lex(' ')[0], 'value', ' ');
      assert.propertyVal(lex('a')[0], 'value', 'a');
      assert.propertyVal(lex('foo')[0], 'value', 'foo');
      assert.propertyVal(lex('+')[0], 'value', '+');
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
      assert.deepEqual(lex(' '), [{type: 'space', value: ' '}]);
      assert.deepEqual(
        lex('2 + sin(t)'),
        [{type: 'literal', value: '2'},
         {type: 'space', value: ' '},
         {type: 'operator', value: '+'},
         {type: 'space', value: ' '},
         {type: 'name', value: 'sin'},
         {type: 'paren', value: '('},
         {type: 'name', value: 't'},
         {type: 'paren', value: ')'}]);
    });
  });
  describe('invalid tokens', function() {
    it('should give 1-char tokens of type "null"', function() {
      assert.deepEqual(lex('!'), [{type: null, value: '!'}]);
      assert.deepEqual(
        lex('!@&'),
        [{type: null, value: '!'},
         {type: null, value: '@'},
         {type: null, value: '&'}]);
      assert.deepEqual(
        lex('abc!def'),
        [{type: 'name', value: 'abc'},
         {type: null, value: '!'},
         {type: 'name', value: 'def'}]);
    });
  });
});


describe('Parser', function() {

  describe('edge cases', function() {
    it('should error on empty expression', function() {
      assert.throws(function() { parse(''); }, parse.ParseError);
      assert.throws(function() { parse('()'); }, parse.ParseError);
      assert.throws(function() { parse('f()'); }, parse.ParseError);
      assert.throws(function() { parse('1+()'); }, parse.ParseError);
    });
  });
  describe('simple cases', function() {
    it('should parse a simple literal value', function() {
      assert.equal(parse('1').expr.type, 'literal');
    });
    it('should parse a simple name', function() {
      assert.equal(parse('a').expr.type, 'name');
    });
    it('should parse a function call', function() {
      assert.equal(parse('f(x)').expr.type, 'func');
    });
    it('should parse operators', function() {
      assert.equal(parse('-1').expr.type, 'operator');
      assert.equal(parse('1-2').expr.type, 'operator');
      assert.equal(parse('1+2').expr.type, 'operator');
      assert.equal(parse('1*2').expr.type, 'operator');
      assert.equal(parse('1/2').expr.type, 'operator');
      assert.equal(parse('1^2').expr.type, 'operator');
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
      assert.equal(parse('(1)').expr.type, 'expr');
      assert.equal(parse('(1)').expr.expr.type, 'literal');
    });
    it('should treat function expressions as subexpressions', function() {
      assert.equal(parse('sin(t)').expr.type, 'func');
      assert.equal(parse('sin(t)').expr.args[0].type, 'expr');
    });
  });
  describe('operators', function() {
    it('should error for trailing operators', function() {
      assert.throws(function() { parse('1+'); }, parse.ParseError);
    });
    it('should error for leading non-unary operators', function() {
      assert.throws(function() { parse('/1'); }, parse.ParseError);
    });
  });
  describe('plus', function() {
    it('should turn unary + into a noop', function() {
      assert.equal(parse('+1').expr.type, 'literal');
      assert.equal(parse('++1').expr.type, 'literal');
    });
    it('should pull minus into plus unary-minus', function() {
      assert.equal(parse('1-2').expr.op, 'plus');
      assert.equal(parse('1-2').expr.args[1].type, 'operator');
    });
    it('should group plusses', function() {
      assert.equal(parse('1+2+3').expr.args.length, 3);
      assert.equal(parse('1+2-3').expr.args.length, 3);
      assert.equal(parse('1-2+3').expr.args.length, 3);
      assert.equal(parse('1-2-3').expr.args.length, 3);
      assert.equal(parse('1-2-3').expr.op, 'plus');
    });
  });
  describe('regressions', function() {
    it('should work for 1^2-3', function() {
      assert.doesNotThrow(function() { parse('1^2-3'); }, parse.ParseError);
    });
  });
});
