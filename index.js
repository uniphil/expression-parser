module.exports = {
  lex: require('./lex'),
  parse: require('./parse'),
  echo: require('./compile-echo'),
  func: require('./compile-func'),
  values: require('./compile-values')
};
