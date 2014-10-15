var R = require('ramda');

var tokenMatches = [
  { type: 'space',    match: /^\s+/ },
  { type: 'literal',  match: /^(\d*\.\d+|\d+)/ },
  { type: 'name',     match: /^[a-zA-Z_]\w*/ },
  { type: 'paren',    match: /^[\(\)\[\]]/ },
  { type: 'operator', match: /^[\+\-\*\/\^<>]/ }
];

var chomp = function(str) {
  var matcher = R.find(R.where({ match: function(re) { return re.test(str); } }), tokenMatches);
  var token = { type: matcher ? matcher.type : null,
                value: matcher ? str.match(matcher.match)[0] : str[0] };
  return { token: token,
           leftover: str.slice(token.value.length) };
};


var chompReduce = function(str) {
  function reducer(initial, leftover) {
    if (!leftover) return initial;  // nothing more to eat!
    var result = chomp(leftover);
    return reducer(R.append(result.token, initial), result.leftover);
  }
  return reducer([], str);
};


module.exports = chompReduce;
