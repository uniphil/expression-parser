Expression Compiler
===================

[![Build Status](https://travis-ci.org/uniphil/expression.svg?branch=master)](https://travis-ci.org/uniphil/expression)

Compile math expressions to a useful AST, with built-in compilers to turn the AST into a sanitized javascript function.


Install
-------

```bash
$ npm install expression-compiler
```


Usage
-----

### Safely execute arbitrary math expression

and also get the raw js generated for the function

```node
> var mkFunc = require('expression-compiler/func');
undefined
> var expressionFunc = compile('c*sin(2*t)+1');
undefined
> expressionFunc({c: 0.5});
0.9999999999999999
> mkFunc.express('sqrt(x^2 + y^2)')
'(Math.sqrt((Math.pow(symbols["x"],2.0)+Math.pow(symbols["y"],2.0))))'
```

Note that everything in the global `Math` is made available by the built-in function compiler, and it is assumed that the global `Math` assumed available by its `express` function.


### Get an Abstract Syntax Tree from a math expression

and then echo back the original expression with just the AST

```node
> var parse = require('expression-compiler/parse');
undefind
> var ast = parse('sin(t)^2 + cos(t)^2');
unefined
> ast
{ id: 0,
  type: 'ASTNode',
  node: 'expr',
  template: '#',
  children: 
   [ { id: 1,
       type: 'ASTNode',
       node: 'func',
       template: '# +#',
       children: [Object],
       options: [Object] } ],
  options: {} }
> console.log(JSON.stringify(ast, null, 2));  // print out the whole thing
{
  "id": 0,
  "type": "ASTNode",
  "node": "expr",
  "template": "#",
  "children": [
    {
      "id": 1,
      "type": "ASTNode",
      "node": "func",
      "template": "# +#",
      "children": [
        {
          "id": 2,
          "type": "ASTNode",
          "node": "func",
          "template": "#^#",
          "children": [
            {
              "id": 3,
              "type": "ASTNode",
              "node": "func",
              "template": "sin(#)",
              "children": [
                {
                  "id": 4,
                  "type": "ASTNode",
                  "node": "name",
                  "template": "t",
                  "children": [],
                  "options": {
                    "key": "t"
                  }
                }
              ],
              "options": {
                "key": "sin"
              }
            },
            {
              "id": 5,
              "type": "ASTNode",
              "node": "literal",
              "template": "2",
              "children": [],
              "options": {
                "value": 2
              }
            }
          ],
          "options": {
            "key": "pow"
          }
        },
        {
          "id": 6,
          "type": "ASTNode",
          "node": "func",
          "template": "#^#",
          "children": [
            {
              "id": 7,
              "type": "ASTNode",
              "node": "func",
              "template": " cos(#)",
              "children": [
                {
                  "id": 8,
                  "type": "ASTNode",
                  "node": "name",
                  "template": "t",
                  "children": [],
                  "options": {
                    "key": "t"
                  }
                }
              ],
              "options": {
                "key": "cos"
              }
            },
            {
              "id": 9,
              "type": "ASTNode",
              "node": "literal",
              "template": "2",
              "children": [],
              "options": {
                "value": 2
              }
            }
          ],
          "options": {
            "key": "pow"
          }
        }
      ],
      "options": {
        "key": "sum"
      }
    }
  ],
  "options": {}
}
undefined
> var echoer = require('expression-compiler/echo');
undefined
> echoer.fromAST(ast);
'sin(t)^2 + cos(t)^2'
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
