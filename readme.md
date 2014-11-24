expression
==========

[![Build Status](https://travis-ci.org/uniphil/expression-compiler.svg?branch=master)](https://travis-ci.org/uniphil/expression-compiler)

fun with math expressions


Install
-------

```bash
$ npm install expression-compiler
```


Usage
-----

```node
> var compile = require('expression');
undefined
> var var exprFn = compile('c*sin(2*t)+1');
undefined
> exprFn({c: 0.5, sin: Math.sin, t: Math.PI});
0.9999999999999999
```


Parsing
-------

New AST node design:

```javascript
{
  id: 0,
  type: 'ASTNode',
  node: 'expr',
  template: '#',
  children: [],
  options: {}
}
```

* `id` must be unique
* `type` must be a valid node type
* `options` contains different properties depending on the node type

### AST Node Types

#### `expr`

options:
```javascript
{}
```

#### `func`

options:
```javascript
{
  key: 'funcName'
}
```

Infix functions should be normal function nodes. Here are some examples for `+` with 2 or 3 operands:

```javascript
{
  id: 0,
  type: 'ASTNode',
  node: 'func',
  template: '# + # + #',
  children: [someNode, anotherNode, andAnother],
  options: {
    key: 'sum'
  }
}
```

Normal functions can take multiple arguments
```javascript
{
  id: 0,
  type: 'ASTNode',
  node: 'func',
  template: 'min(#, #)',
  children: [someNode, anotherNode],
  options: {
    key: 'min'
  }
}
```


#### `name`

options:
```javascript
{
  key: 'varName'
}
```

### `literal`

options:
```javascript
{
  value: 1
}
```
