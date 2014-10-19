expression
==========

[![Build Status](https://travis-ci.org/uniphil/expression.svg)](https://travis-ci.org/uniphil/expression)

fun with math expressions


Parsing
-------

Here is the basic idea of the AST structure:
```
' '
{
  type: 'expr',
  parens: false,
  template: ' ',
  expr: null
}

'1'
{
  type: 'expr',
  parens: false,
  template: '#',
  expr: {
    type: 'literal',
    template: '1',
    value: 1
  }
}

'a'
{
  type: 'expr',
  parens: false,
  template: '#'
  expr: {
    type: 'name',
    template: 'a',
    key: 'a'
  }
}

'(1)'
{
  type: 'expr',
  parens: true,
  template: '(#)'
  expr: {
    type: 'literal',
    template: '1',
    value: 1
  }
}

'-1'
{
  type: 'expr',
  parens: false,
  template: '#',
  expr: {
    type: 'operator',
    op: 'minus',
    template: '-#',
    args: [
      {
        type: 'literal',
        template: '1',
        value: 1
      }
    ]
  }
}

'1+1'
{
  type: 'expr',
  parens: false,
  template: '#',
  expr: {
    type: 'operator',
    op: 'plus',
    template: '#+#',
    args: [
      {
        type: 'literal',
        template: '1',
        value: 1
      },
      {
        type: 'literal',
        template: '1',
        value: 1
      }
    ]
  }
}

'1-1'
{
  type: 'expr',
  parens: false,
  template: '#',
  expr: {
    type: 'operator',
    op: 'plus',
    template: '##',
    args: [
      {
        type: 'literal',
        template: '1',
        value: 1
      },
      {
        type: 'operator',
        op: 'minus',
        template: '-#'
        args: [
          {
            type: 'literal',
            template: '1',
            value: 1
          }
        ]
      }
    ]
  }
}

'1 + 1 - 1'
{
  type: 'expr',
  parens: false,
  template: '#',
  expr: {
    type: 'operator',
    op: 'plus',
    template: '# + # #',
    args: [
      {
        type: 'literal',
        template: '1',
        value: 1
      },
      {
        type: 'literal',
        template: '1',
        value: 1
      },
      {
        type: 'operator',
        op: 'minus',
        template: '- #',
        args: [
          {
            type: 'literal',
            template: '1',
            value: 1
          }
        ]
      }
    ]
  }
}

'sin(t)'
{
  type: 'expr',
  parens: false,
  template: '#',
  expr: {
    type: 'func',
    key: 'sin',
    template: 'sin#',
    args: [
      {
        type: 'expr'
        parens: true,
        template: '(#)',
        expr: {
          type: 'name',
          template: 'a',
          key: 'a'
        }
      }
    ]
  }
}
```

The parser is not quite there yet, but close. Mostly it is missing `template` keys. It should be possible to compile the AST into an executable right now though. Here are some samples of the current output, expressions stollen from the [mojulo gallery](http://maxbittker.github.io/Mojulo/gallery.html).


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

```
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
