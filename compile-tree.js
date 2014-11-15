var R = require('ramda');
var parse = require('./parse');

var fakeElement = function FakeEl(name) {
  if (!(this instanceof FakeEl)) {
    return new FakeEl(name);
  }
  this.el = name;
  this.stuff = [];
  this.classList = [];
  this.classList.add = (function(ctx) {
    return function(name) {
      ctx.classList.push(name);
    };
  })(this);
  this.appendChild = function(el) {
    this.stuff.push(el);
  };
  this.textContent = '';
  return this;
};

var IS_BROWSER = typeof document !== 'undefined';

var elCreator = IS_BROWSER ?
  function(name) { return document.createElement(name); } :
  fakeElement;

var txtCreator = IS_BROWSER ?
  function(txt) { return document.createTextNode(txt); } :
  function(txt) { return txt; };

var write = IS_BROWSER ?
  function(el) { document.body.appendChild(el); } :
  function(el) { return el; };


var mkDomifier = function(pair) {
  var type = pair[0],
      spec = pair[1],
      d = {};
  d[type] = function(node, children) {
    var el = elCreator('span');
    el.classList.add('expr-group', 'expr-' + type);
    spec(node, children, el);
    return el;
  };
  return d;
};


var domifiers = R.compose(
  R.reduce(R.mixin, {}),
  R.map(mkDomifier),
  R.toPairs
)({
  expr: function(node, children, el) {
    el.appendChild(txtCreator('('));
    el.appendChild(children[0]);
    el.appendChild(txtCreator(')'));
  },
  literal: function(node, children, el) {
    el.appendChild(txtCreator(node.value));
  },
  name: function(node, children, el) {
    el.appendChild(txtCreator(node.key));
  },
  func: function(node, children, el) {
    el.appendChild(txtCreator(node.key));
    el.appendChild(children[0]);
  },
  operator: function(node, children, el) {
    var symbols = {
      power: '^',
      times: '*',
      over: '/',
      mod: '%',
      plus: '+',
      minus: '-',
      less: '<',
      greater: '>'
    };
    R.forEach.idx(function(c, i, list) {
      el.appendChild(c);
      if (i < (list.length - 1)) {
        el.appendChild(txtCreator(symbols[node.op]));
      }
    }, children);
  }
});


function domify(root, ider) {
  var children = R.map(domify, root.children);
  return domifiers[root.type](root, children);
}


module.exports = R.compose(write, domify, parse);
