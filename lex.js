var R = require('ramda');


var tokenStates = [
  {
    name: 'space',
    match: /\s/,
    next: ['space'],
    enter: true,
    exit: 'space'
  },
  {
    name: 'num',
    match: /\d/,
    next: ['num', 'dot'],
    enter: true,
    exit: 'literal'
  },
  {
    name: 'dot',
    match: /\./,
    next: ['num_after_dot'],
    enter: true,
    exit: null
  },
  {
    name: 'num_after_dot',
    match: /\d/,
    next: ['num_after_dot'],
    enter: false,
    exit: 'literal'
  },
  {
    name: 'letter',
    match: /[a-zA-Z_]/,
    next: ['letter', 'num_after_letter'],
    enter: true,
    exit: 'name'
  },
  {
    name: 'num_after_letter',
    match: /\d/,
    next: ['letter', 'num_after_letter'],
    enter: false,
    exit: 'name'
  },
  {
    name: 'open_paren',
    match: /\(/,
    next: [],
    enter: true,
    exit: 'paren'
  },
  {
    name: 'open_bracket',
    match: /\[/,
    next: [],
    enter: true,
    exit: 'paren'
  },
  {
    name: 'close_paren',
    match: /\)/,
    next: [],
    enter: true,
    exit: 'paren'
  },
  {
    name: 'close_bracket',
    match: /\]/,
    next: [],
    enter: true,
    exit: 'paren'
  },
  {
    name: 'caret',
    match: /\^/,
    next: [],
    enter: true,
    exit: 'operator'
  },
  {
    name: 'star',
    match: /\*/,
    next: [],
    enter: true,
    exit: 'operator'
  },
  {
    name: 'div',
    match: /\//,
    next: [],
    enter: true,
    exit: 'operator'
  },
  {
    name: 'plus',
    match: /\+/,
    next: [],
    enter: true,
    exit: 'operator'
  },
  {
    name: 'minus',
    match: /\-/,
    next: [],
    enter: true,
    exit: 'operator'
  },
  {
    name: 'less',
    match: /</,
    next: [],
    enter: true,
    exit: 'operator'
  },
  {
    name: 'greater',
    match: />/,
    next: [],
    enter: true,
    exit: 'operator'
  }
];


// [tokenState] -> [names] -> tokenState
var charToken = R.curry(function(tokenStates, allowedStates, chr) {
  return R.find(R.where(R.mixin(
    { match: function(tsRe) { return tsRe.test(chr); } },
    allowedStates
      ? { name: R.flip(R.contains)(allowedStates) }
      : { enter: true }
  )), tokenStates)
});


// str -> (token, str|undefined)
var chomp = function(str) {
  var i = 0,
      token,
      next = null,
      exit = null;
  while (1) {
    token = charToken(tokenStates, next, str[i]);
    if (!token || (i >= str.length)) break;
    next = token.next;
    exit = token.exit;
    i++;
  }

  return {
    token: { type: exit, value: R.substringTo(i, str) },
    remainingStr: R.substringFrom(i, str)
  };
};


// (str -> (a, str|undefined)) -> str -> [a]
var chompReduce = R.curry(function(chomper, str) {
  function reducer(initial, remainingStr) {
    if (!remainingStr) return initial;  // nothing more to eat!
    var result = chomper(remainingStr);
    return reducer(R.append(result.token, initial), result.remainingStr);
  }
  return reducer([], str);
});


module.exports = chompReduce(chomp);
