mvmt
====



[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/mvmt.svg)](https://npmjs.org/package/mvmt)
[![Downloads/week](https://img.shields.io/npm/dw/mvmt.svg)](https://npmjs.org/package/mvmt)
[![License](https://img.shields.io/npm/l/mvmt.svg)](https://github.com/danjrauch/mvmt/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g mvmt
$ mvmt COMMAND
running command...
$ mvmt (-v|--version|version)
mvmt/0.0.0 darwin-x64 node-v11.5.0
$ mvmt --help [COMMAND]
USAGE
  $ mvmt COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`mvmt bulk`](#mvmt-bulk)
* [`mvmt help [COMMAND]`](#mvmt-help-command)
* [`mvmt query`](#mvmt-query)

## `mvmt bulk`

bulk migrate data to some environment

```
USAGE
  $ mvmt bulk

OPTIONS
  -a, --alias=alias        (required)
  -o, --object=object      (required)
  -p, --path=path          (required)
  --delete
  --extIdField=extIdField
  --insert
  --update
  --upsert

ALIASES
  $ mvmt b

EXAMPLE
  $ mvmt bulk -a some_org_alias -o Contact -p ../../folder/csv --insert
```

_See code: [src/commands/bulk.js](https://github.com/danjrauch/mvmt/blob/v0.0.0/src/commands/bulk.js)_

## `mvmt help [COMMAND]`

display help for mvmt

```
USAGE
  $ mvmt help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.0/src/commands/help.ts)_

## `mvmt query`

query data from some environment

```
USAGE
  $ mvmt query

OPTIONS
  -a, --alias=alias  (required)
  -p, --path=path
  -q, --query=query  (required)

ALIASES
  $ mvmt q

EXAMPLE
  $ mvmt query -q "SELECT ID, Name FROM Contact" -a some_org_alias -p ../../folder
```

_See code: [src/commands/query.js](https://github.com/danjrauch/mvmt/blob/v0.0.0/src/commands/query.js)_
<!-- commandsstop -->
