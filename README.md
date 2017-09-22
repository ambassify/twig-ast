# Twig-AST

Parses Twig templates into an AST.

## Usage

```js
const TwigAST = require('twig-ast');
const ASTUtils = require('twig-ast/dist/print');

const ast = TwigAST.toAST('Hello {{planet}}');

ASTUtils.print(ast);
```

Returns

```txt
Tree                                  Derived from
-----                                 -------------
  TEXT                                "Hello {{planet}}"
  ├ LITERAL                           "Hello "
  ├ TAG_OUTPUT                        "{{planet}}"
  │ └ EXPRESSION                      "planet"
  │   └ VARIABLE (planet)             "planet"
  └ LITERAL                           ""
```

## Contribute

We really appreciate any contribution you would like to make, so don't
hesitate to report issues or submit pull requests.

## License

This project is released under a MIT license.

## About us

If you would like to know more about us, be sure to have a look at [our website](https://www.ambassify.com), or our Twitter accounts [Ambassify](https://twitter.com/Ambassify), [Sitebase](https://twitter.com/Sitebase), [JorgenEvens](https://twitter.com/JorgenEvens)
