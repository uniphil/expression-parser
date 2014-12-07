var R = require('ramda');

var tokenMatches = [
  { type: 'space',    match: /^\s+/ },
  { type: 'literal',  match: /^(\d*\.\d+|\d+)/ },
  { type: 'name',     match: /^[a-zA-Z_]\w*/ },
  { type: 'paren',    match: /^[\(\)]/ },
  { type: 'operator', match: /^[\+\-%\*\/\^<>]/ }
];


var mkToken = function(token, value, repr) {
  return {
    type: 'token',
    token: token,
    value: value,
    repr: repr || value
  };
};


var checkToken = function(token, checks) {
  checks = checks || {};
  return !!token && token.type === 'token' &&
    (token.token === checks.token || !checks.token) &&
    (token.value === checks.value || !checks.value);
};


var chomp = function(str) {
  var matcher = R.find(R.where({ match: function(re) { return re.test(str); } }), tokenMatches);
  var token = matcher ?
    mkToken(matcher.type, str.match(matcher.match)[0]) :
    mkToken(null, str[0]);
  return { token: token, leftover: str.slice(token.value.length) };
};


var chompReduce = function(str) {
  function reducer(initial, leftover) {
    if (!leftover) { return initial; }  // nothing more to eat!
    var result = chomp(leftover);
    return reducer(R.append(result.token, initial), result.leftover);
  }
  return reducer([], str);
};


chompReduce.token = mkToken;
chompReduce.check = checkToken;

module.exports = chompReduce;
