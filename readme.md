Expression Parser
=================

[![Build Status](https://travis-ci.org/uniphil/expression-parser.svg?branch=master)](https://travis-ci.org/uniphil/expression-parser)
[![Coverage Status](https://img.shields.io/coveralls/uniphil/expression-parser.svg)](https://coveralls.io/r/uniphil/expression-parser)

Parse math expressions to a useful AST, with built-in compilers for:
 * creating a sanitized executable javascript function
 * creating a function that returns a value for every node of the AST when executed
 * echoes back the original expression if parsing succeeds

The compilers are provided for convenience, an will not be pulled into a build unless you specifically `require` them. The AST is pretty easy to walk if you build your own compiler -- the echo compiler only requires [seven lines of code](https://github.com/uniphil/expression-parser/blob/fa7a0e2a9207fd48752d3376dc624f2b9b58d31a/echo.js#L7-L15) to implement


Install
-------

```bash
$ npm install expression-parser
```


Usage
-----

### Safely execute arbitrary math expression

and also get the raw js generated for the function

```node
> var mkFunc = require('expression-parser/func');
> var expressionFunc = compile('c*sin(2*t)+1');
> expressionFunc({c: 0.5});
0.9999999999999999
> mkFunc.express('sqrt(x^2 + y^2)')
'(Math.sqrt((Math.pow(symbols["x"],2.0)+Math.pow(symbols["y"],2.0))))'
```

Note that everything in the global `Math` is made available by the built-in function compiler, and it is assumed that the global `Math` assumed available by its `express` function.


### Get an Abstract Syntax Tree from a math expression

and then echo back the original expression with just the AST

```node
> var parse = require('expression-parser/parse');
> var ast = parse('sin(t)^2 + cos(t)^2');
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
> var valuer = require('expression-parser/values');
> values.fromAST(ast)({t: 0})
[ 1,
  1,
  0,
  0,
  0,
  2,
  1,
  1,
  0,
  2 ]
> var echoer = require('expression-parser/echo');
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
  node: 'func',u
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


License
-------
[MIT](license)
