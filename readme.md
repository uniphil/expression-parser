expression
==========

[![Build Status](https://travis-ci.org/uniphil/expression.svg?branch=master)](https://travis-ci.org/uniphil/expression)

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


### Current examples (out of date parser)

Here are some samples of the current output, expressions stollen from the [mojulo gallery](http://maxbittker.github.io/Mojulo/gallery.html).


#### x*y*time

```JSON
{
  "type": "expr",
  "expr": {
    "type": "operator",
    "op": "times",
    "args": [
      {
        "type": "name",
        "template": "x",
        "key": "x"
      },
      {
        "type": "name",
        "template": "y",
        "key": "y"
      },
      {
        "type": "name",
        "template": "time",
        "key": "time"
      }
    ]
  }
}
```


### sin((r+time)/A)*2

```JSON
{
  "type": "expr",
  "expr": {
    "type": "operator",
    "op": "times",
    "args": [
      {
        "type": "func",
        "key": "sin",
        "template": "sin#",
        "args": [
          {
            "type": "expr",
            "expr": {
              "type": "operator",
              "op": "times",
              "normalized": "times",
              "args": [
                {
                  "type": "expr",
                  "expr": {
                    "type": "operator",
                    "op": "plus",
                    "args": [
                      {
                        "type": "name",
                        "template": "r",
                        "key": "r"
                      },
                      {
                        "type": "name",
                        "template": "time",
                        "key": "time"
                      }
                    ]
                  }
                },
                {
                  "type": "operator",
                  "op": "over",
                  "args": [
                    {
                      "type": "literal",
                      "template": "1",
                      "value": 1
                    },
                    {
                      "type": "name",
                      "template": "A",
                      "key": "A"
                    }
                  ]
                }
              ]
            }
          }
        ]
      },
      {
        "type": "literal",
        "template": "2",
        "value": 2
      }
    ]
  }
}
```

### x^2-y^2+time*3000

```JSON
{
  "type": "expr",
  "expr": {
    "type": "operator",
    "op": "plus",
    "normalized": "plus",
    "args": [
      {
        "type": "operator",
        "op": "power",
        "args": [
          {
            "type": "name",
            "template": "x",
            "key": "x"
          },
          {
            "type": "literal",
            "template": "2",
            "value": 2
          }
        ]
      },
      {
        "type": "operator",
        "op": "minus",
        "args": [
          {
            "type": "literal",
            "template": "0",
            "value": 0
          },
          {
            "type": "operator",
            "op": "power",
            "args": [
              {
                "type": "name",
                "template": "y",
                "key": "y"
              },
              {
                "type": "literal",
                "template": "2",
                "value": 2
              }
            ]
          }
        ]
      },
      {
        "type": "operator",
        "op": "times",
        "args": [
          {
            "type": "name",
            "template": "time",
            "key": "time"
          },
          {
            "type": "literal",
            "template": "3000",
            "value": 3000
          }
        ]
      }
    ]
  }
}
```
